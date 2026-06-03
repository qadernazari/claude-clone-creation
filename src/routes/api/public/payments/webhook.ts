import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const meta = session.metadata ?? {};
  const userId: string | undefined = meta.userId;
  const filmId: string | undefined = meta.film_id;
  const ticketHours = Number(meta.ticket_hours ?? 48) || 48;

  if (!userId || !filmId) {
    console.error("checkout.session.completed missing userId/film_id metadata", session.id);
    return;
  }

  // Stripe's payment_status for one-time mode: "paid" | "unpaid" | "no_payment_required"
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

  // Best-effort event log (don't fail the webhook on this)
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
