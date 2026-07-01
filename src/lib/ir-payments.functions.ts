import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

const ZARINPAL_REQUEST_URL = "https://api.ir.show/zarinpal/pg/v4/payment/request.json";
const ZARINPAL_STARTPAY_URL = "https://payment.zarinpal.com/pg/StartPay/";
const ZARINPAL_VERIFY_URL = "https://api.ir.show/zarinpal/pg/v4/payment/verify.json";

const createSchema = z.object({
  kind: z.enum(["membership", "ticket", "contribution"]),
  itemId: z.string().min(1).max(120),
  amountToman: z.number().int().min(1000).max(500_000_000),
  couponCode: z.string().min(1).max(64).optional(),
  description: z.string().min(1).max(255).optional(),
});

export const createIrCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof createSchema>) => createSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string; authority: string } | { error: string }> => {
    const { userId } = context;
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) return { error: "Gateway not configured" };

    const callbackUrl = new URL("https://ir.show/api/public/ir-payments/callback");
    callbackUrl.searchParams.set("kind", data.kind);
    callbackUrl.searchParams.set("itemId", data.itemId);
    callbackUrl.searchParams.set("userId", userId);

    try {
      const res = await fetch(ZARINPAL_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: data.amountToman,
          callback_url: callbackUrl.toString(),
          description: data.description ?? `Payment for ${data.kind} ${data.itemId}`,
        }),
      });

      const json = (await res.json()) as {
        data?: { code: number; authority: string; message: string };
        errors?: { code: number; message: string } | unknown[];
      };

      const authority = json.data?.authority;
      if (json.data?.code !== 100 || !authority) {
        console.error("[createIrCheckout] ZarinPal request failed", json);
        return { error: "درخواست پرداخت ناموفق بود." };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: insertErr } = await supabaseAdmin.from("ir_payment_requests").insert({
        authority,
        user_id: userId,
        kind: data.kind,
        item_id: data.itemId,
        amount_toman: data.amountToman,
        coupon_code: data.couponCode ?? null,
        status: "pending",
      });
      if (insertErr) {
        console.error("[createIrCheckout] insert failed", insertErr);
        return { error: "ثبت درخواست ناموفق بود." };
      }

      return { url: `${ZARINPAL_STARTPAY_URL}${authority}`, authority };
    } catch (err) {
      console.error("[createIrCheckout] fetch error", err);
      return { error: "ارتباط با درگاه برقرار نشد." };
    }
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
