import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ir-payments/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("Status");
        const authority = url.searchParams.get("Authority");
        const kind = url.searchParams.get("kind") as
          | "membership"
          | "ticket"
          | "contribution"
          | null;
        const itemId = url.searchParams.get("itemId");
        const userId = url.searchParams.get("userId");

        const failureUrl = new URL("/account", url.origin);
        failureUrl.searchParams.set("ir_payment", "failed");

        if (status !== "OK" || !authority || !kind || !itemId || !userId) {
          return Response.redirect(failureUrl.toString(), 302);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: pending } = await supabaseAdmin
            .from("ir_payment_requests")
            .select("*")
            .eq("authority", authority)
            .eq("status", "pending")
            .maybeSingle();

          if (!pending) {
            return Response.redirect(failureUrl.toString(), 302);
          }

          const merchantId = process.env.ZARINPAL_MERCHANT_ID;
          if (!merchantId) {
            return Response.redirect(failureUrl.toString(), 302);
          }

          const verifyRes = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              merchant_id: merchantId,
              amount: pending.amount_toman,
              authority,
            }),
          });

          const verifyJson = (await verifyRes.json()) as {
            data?: { code: number; ref_id: number };
            errors?: { code: number };
          };

          const verified = verifyJson.data?.code === 100 || verifyJson.data?.code === 101;

          if (!verified) {
            await supabaseAdmin
              .from("ir_payment_requests")
              .update({ status: "failed" })
              .eq("authority", authority);
            return Response.redirect(failureUrl.toString(), 302);
          }

          const refId = String(verifyJson.data!.ref_id);

          await supabaseAdmin
            .from("ir_payment_requests")
            .update({ status: "paid", ref_id: refId })
            .eq("authority", authority);

          if (kind === "membership") {
            const months = Math.max(1, Math.round(pending.amount_toman / 99_000));
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setMonth(expiresAt.getMonth() + months);

            await supabaseAdmin.from("subscriptions").insert({
              user_id: userId,
              status: "active",
              environment: "live",
              amount_toman: pending.amount_toman,
              ref_id: refId,
              authority,
              ir_gateway: "zarinpal",
              current_period_end: expiresAt.toISOString(),
            });
          }

          const successUrl = new URL("/account", url.origin);
          successUrl.searchParams.set("ir_payment", "success");
          successUrl.searchParams.set("ref", refId);
          return Response.redirect(successUrl.toString(), 302);
        } catch (err) {
          console.error("[ZarinPal callback error]", err);
          return Response.redirect(failureUrl.toString(), 302);
        }
      },
      POST: async ({ request }) => {
        void request;
        return new Response("ok", { status: 200 });
      },
    },
  },
});
