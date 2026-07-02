import { createFileRoute } from "@tanstack/react-router";
import { getPlan, type MembershipPlanId } from "@/lib/membership-plans";

export const Route = createFileRoute("/api/public/ir-payments/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("Status");
        const authority = url.searchParams.get("Authority");

        const failureUrl = new URL("https://ir.show/account");
        failureUrl.searchParams.set("ir_payment", "failed");

        const cancelledUrl = new URL("https://ir.show/account");
        cancelledUrl.searchParams.set("ir_payment", "cancelled");

        if (status !== "OK" || !authority) {
          // ZarinPal sends Status=NOK when the user cancels at the gateway.
          if (status === "NOK") return Response.redirect(cancelledUrl.toString(), 302);
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

          const trustedUserId = pending.user_id;
          const kind = pending.kind;
          const itemId = pending.item_id;

          const merchantId = process.env.ZARINPAL_MERCHANT_ID;
          if (!merchantId) {
            return Response.redirect(failureUrl.toString(), 302);
          }


          const verifyRes = await fetch("https://api.ir.show/zarinpal/pg/v4/payment/verify.json", {
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

          let monthsForEmail = 0;
          let expiresIso: string | null = null;
          if (kind === "membership") {
            const months = Math.max(1, Math.round(pending.amount_toman / 99_000));
            monthsForEmail = months;
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setMonth(expiresAt.getMonth() + months);
            expiresIso = expiresAt.toISOString();

            await supabaseAdmin.from("subscriptions").insert({
              user_id: trustedUserId,
              status: "active",
              environment: "live",
              amount_toman: pending.amount_toman,
              ref_id: refId,
              authority,
              ir_gateway: "zarinpal",
              current_period_start: now.toISOString(),
              current_period_end: expiresIso,
            });
          }

          // Fire off a confirmation email. Never let a mail failure block redirect.
          try {
            if (kind === "membership") {
              const { data: userData } = await supabaseAdmin.auth.admin.getUserById(trustedUserId);
              const userEmail = userData?.user?.email;
              const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (userEmail && serviceKey) {
                const expiresFormatted = expiresIso
                  ? new Date(expiresIso).toLocaleDateString("en-US", { dateStyle: "long" })
                  : "";
                await fetch("https://ir.show/lovable/email/transactional/send", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({
                    templateName: "membership-activated",
                    recipientEmail: userEmail,
                    idempotencyKey: `ir-membership-${refId}`,
                    templateData: {
                      monthsLabel: `${monthsForEmail} month${monthsForEmail === 1 ? "" : "s"}`,
                      expiresFormatted,
                      refId,
                      browseUrl: "https://ir.show/browse",
                      accountUrl: "https://ir.show/account",
                    },
                  }),
                });
              }
            }
          } catch (emailErr) {
            console.error("[ZarinPal callback] email send failed:", emailErr);
          }


          const successUrl = new URL("https://ir.show/account");
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
