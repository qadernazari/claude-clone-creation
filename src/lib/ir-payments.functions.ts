import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

const ZARINPAL_VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json";

const recordSchema = z.object({
  authority: z.string().min(1).max(120),
  kind: z.enum(["membership", "ticket", "contribution"]),
  itemId: z.string().min(1).max(120),
  amountToman: z.number().int().min(1000).max(500_000_000),
  couponCode: z.string().min(1).max(64).optional(),
});

/**
 * Records a pending ZarinPal payment request AFTER the browser has
 * successfully called ZarinPal directly (see src/lib/ir-payments.client.ts).
 *
 * Cloudflare Workers and Hetzner cannot reach api.zarinpal.com from outside
 * Iran, so the payment request itself is made from the user's browser.
 * This function only persists the resulting authority so the callback route
 * can verify the payment later.
 */
export const recordIrPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof recordSchema>) => recordSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ir_payment_requests").insert({
      authority: data.authority,
      user_id: userId,
      kind: data.kind,
      item_id: data.itemId,
      amount_toman: data.amountToman,
      coupon_code: data.couponCode ?? null,
      status: "pending",
    });
    if (error) {
      console.error("[recordIrPaymentRequest] insert failed", error);
      return { error: "ثبت درخواست ناموفق بود." };
    }
    return { ok: true };
  });

export const verifyIrCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { authority: string; amountToman: number }) => data)
  .handler(async ({ data }): Promise<{ success: boolean; refId?: string; error?: string }> => {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) return { success: false, error: "Gateway not configured" };

    try {
      const res = await fetch(ZARINPAL_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: data.amountToman,
          authority: data.authority,
        }),
      });

      const json = (await res.json()) as {
        data?: { code: number; ref_id: number; card_pan: string };
        errors?: { code: number; message: string };
      };

      if (json.data?.code === 100 || json.data?.code === 101) {
        return { success: true, refId: String(json.data.ref_id) };
      }

      return { success: false, error: `Verification failed: code ${json.data?.code ?? "unknown"}` };
    } catch (err) {
      console.error("[ZarinPal verifyIrCheckout error]", err);
      return { success: false, error: "Verification request failed" };
    }
  });
