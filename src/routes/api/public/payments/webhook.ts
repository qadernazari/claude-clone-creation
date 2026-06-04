import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function formatUsd(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatExpiry(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function sendReceipt(
  origin: string,
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY for receipt send");
    return;
  }
  try {
    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    });
    if (!res.ok) {
      console.error("Receipt send failed", templateName, res.status, await res.text());
    }
  } catch (e) {
    console.error("Receipt send error", e);
  }
}

async function addToNotifyList(admin: any, email: string | null | undefined) {
  if (!email) return;
  const lower = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) return;
  const { error } = await admin
    .from("notify_list")
    .upsert({ email_lower: lower }, { onConflict: "email_lower", ignoreDuplicates: true });
  if (error) console.error("notify_list upsert failed:", error.message);
}

async function grantSupporterRole(admin: any, userId: string | null | undefined) {
  if (!userId) return;
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "supporter" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (error) console.error("grant supporter role failed:", error.message);
}

async function notifyAdmins(
  admin: any,
  origin: string,
  providerRef: string,
  data: {
    kind: "ticket" | "contribution";
    buyerEmail: string;
    amountFormatted: string;
    filmTitleEn: string | null;
    occurredAtFormatted: string;
  },
) {
  const { data: admins, error } = await admin
    .from("user_roles")
    .select("profiles:profiles!inner(email)")
    .eq("role", "admin");
  if (error) {
    console.error("Failed to load admin emails:", error.message);
    return;
  }
  const emails = (admins ?? [])
    .map((r: any) => r?.profiles?.email)
    .filter((e: any): e is string => typeof e === "string" && e.length > 0);
  for (const adminEmail of emails) {
    await sendReceipt(
      origin,
      "purchase-admin-notification",
      adminEmail,
      `admin-${data.kind}-${providerRef}-${adminEmail}`,
      data,
    );
  }
}

async function handleContribution(session: any, origin: string) {
  const meta = session.metadata ?? {};
  const userId: string | undefined = meta.userId;
  const filmId: string | undefined = meta.film_id;
  const supporter: string | undefined = session.customer_details?.email ?? undefined;

  if (session.payment_status !== "paid") {
    console.log("Ignoring unpaid contribution session", session.id, session.payment_status);
    return;
  }

  const amount = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toLowerCase();
  const providerRef = (session.payment_intent as string | null) ?? session.id;

  const admin = await getAdmin();
  const { error } = await admin
    .from("contributions")
    .upsert(
      {
        user_id: userId ?? null,
        film_id: filmId ?? null,
        supporter: supporter ?? null,
        status: "paid",
        provider: "stripe",
        provider_ref: providerRef,
        amount,
        currency,
        paid_at: new Date().toISOString(),
      },
      { onConflict: "provider_ref" },
    );

  if (error) {
    console.error("Failed to upsert contribution:", error.message);
    throw new Error(error.message);
  }

  // Receipt email
  if (supporter) {
    let filmTitleEn: string | null = null;
    let filmTitleFa: string | null = null;
    if (filmId) {
      const { data: film } = await admin
        .from("films")
        .select("title_en, title_fa")
        .eq("id", filmId)
        .maybeSingle();
      filmTitleEn = film?.title_en ?? null;
      filmTitleFa = film?.title_fa ?? null;
    }
    await sendReceipt(origin, "contribution-receipt", supporter, `contribution-${providerRef}`, {
      amountFormatted: formatUsd(amount, currency),
      filmTitleEn,
      filmTitleFa,
    });

    await addToNotifyList(admin, supporter);
    await notifyAdmins(admin, origin, providerRef, {
      kind: "contribution",
      buyerEmail: supporter,
      amountFormatted: formatUsd(amount, currency),
      filmTitleEn,
      occurredAtFormatted: formatExpiry(new Date()),
    });
  }

  await grantSupporterRole(admin, userId);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv, origin: string) {
  const meta = session.metadata ?? {};

  // Branch by intent: contributions vs ticket purchases.
  if (meta.type === "contribution") {
    await handleContribution(session, origin);
    const admin = await getAdmin();
    await admin.from("payment_events").upsert(
      { id: session.id, provider: "stripe", type: "checkout.session.completed:contribution" },
      { onConflict: "id" },
    );
    void env;
    return;
  }

  const userId: string | undefined = meta.userId;
  const filmId: string | undefined = meta.film_id;
  const filmSlug: string | undefined = meta.film_slug;
  const ticketHours = Number(meta.ticket_hours ?? 48) || 48;

  if (!userId || !filmId) {
    console.error("checkout.session.completed missing userId/film_id metadata", session.id);
    return;
  }

  if (session.payment_status !== "paid") {
    console.log("Ignoring unpaid session", session.id, session.payment_status);
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ticketHours * 60 * 60 * 1000);
  const amount = session.amount_total ?? null;
  const currency = (session.currency ?? "usd").toLowerCase();
  const providerRef = (session.payment_intent as string | null) ?? session.id;

  const admin = await getAdmin();
  const { error } = await admin
    .from("tickets")
    .upsert(
      {
        user_id: userId,
        film_id: filmId,
        status: "paid",
        provider: "stripe",
        provider_ref: providerRef,
        amount,
        currency,
        paid_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "provider,provider_ref" },
    );

  if (error) {
    console.error("Failed to upsert ticket:", error.message);
    throw new Error(error.message);
  }

  await admin.from("payment_events").upsert(
    { id: session.id, provider: "stripe", type: "checkout.session.completed" },
    { onConflict: "id" },
  );

  // Receipt email
  const recipient = session.customer_details?.email as string | undefined;
  let filmTitleEn: string | null = null;
  if (recipient) {
    const { data: film } = await admin
      .from("films")
      .select("title_en, title_fa, slug")
      .eq("id", filmId)
      .maybeSingle();
    const slug = film?.slug ?? filmSlug ?? "";
    filmTitleEn = film?.title_en ?? null;
    await sendReceipt(origin, "ticket-receipt", recipient, `ticket-${providerRef}`, {
      filmTitleEn: filmTitleEn ?? "your film",
      filmTitleFa: film?.title_fa ?? null,
      amountFormatted: amount ? formatUsd(amount, currency) : "",
      ticketHours,
      expiresAtFormatted: formatExpiry(expiresAt),
      watchUrl: slug ? `${origin}/watch/${slug}` : origin,
    });

    await addToNotifyList(admin, recipient);
    await notifyAdmins(admin, origin, providerRef, {
      kind: "ticket",
      buyerEmail: recipient,
      amountFormatted: amount ? formatUsd(amount, currency) : "",
      filmTitleEn,
      occurredAtFormatted: formatExpiry(now),
    });
  }

  await grantSupporterRole(admin, userId);

  void env;
}


async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Subscription event missing userId metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const trialEnd = subscription.trial_end;

  const admin = await getAdmin();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId ?? "iran_membership",
      price_id: priceId ?? "membership_monthly",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) {
    console.error("subscription upsert failed:", error.message);
    throw new Error(error.message);
  }
}

async function markSubscriptionCanceled(subscription: any, env: StripeEnv) {
  const admin = await getAdmin();
  await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        const origin = new URL(request.url).origin;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed": {
              const session: any = event.data.object;
              // Subscription checkouts: skip the ticket path; the subscription.*
              // events below handle persistence. PPV (no kind=membership) keeps
              // running through handleCheckoutCompleted.
              if (session.mode === "subscription" || session.metadata?.kind === "membership") {
                console.log("Membership checkout completed", session.id);
                break;
              }
              await handleCheckoutCompleted(session, env, origin);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await markSubscriptionCanceled(event.data.object, env);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
