import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function handleContribution(session: any) {
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
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const meta = session.metadata ?? {};

  // Branch by intent: contributions vs ticket purchases.
  if (meta.type === "contribution") {
    await handleContribution(session);
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

  void env;
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
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
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
