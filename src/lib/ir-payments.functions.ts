import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

const ZARINPAL_REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_STARTPAY_URL = "https://www.zarinpal.com/pg/StartPay/";
const ZARINPAL_VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json";

const inputSchema = z.object({
  kind: z.enum(["membership", "ticket", "contribution"]),
  itemId: z.string().min(1).max(120),
  amountToman: z.number().int().min(1000).max(500_000_000),
  couponCode: z.string().min(1).max(64).optional(),
});

export const createIrCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof inputSchema>) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ redirectUrl: string } | { error: string }> => {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    console.log("[ZarinPal createIrCheckout] start", {
      merchantIdMasked: merchantId ? `${merchantId.slice(0, 8)}...` : "MISSING",
      kind: data.kind,
      itemId: data.itemId,
      amountToman: data.amountToman,
    });
    if (!merchantId) {
      return { error: "درگاه پرداخت پیکربندی نشده است." };
    }

    const { userId } = context;
    const amountToman = data.amountToman;

    const callbackUrl = `https://ir.show/api/public/ir-payments/callback?kind=${data.kind}&itemId=${encodeURIComponent(data.itemId)}&userId=${encodeURIComponent(userId)}`;

    const description =
      data.kind === "membership"
        ? "عضویت در پلتفرم ایران"
        : data.kind === "ticket"
        ? "بلیت فیلم ایران"
        : "حمایت از ایران";

    try {
      const res = await fetch(ZARINPAL_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: amountToman,
          currency: "IRT",
          description,
          callback_url: callbackUrl,
          metadata: {
            kind: data.kind,
            itemId: data.itemId,
            userId,
            couponCode: data.couponCode ?? null,
          },
        }),
      });

      const json = (await res.json()) as {
        data?: { code: number; authority: string; fee_type: string; fee: number };
        errors?: { code: number; message: string; validations?: unknown[] } | unknown[];
      };

      if (json.data?.code === 100 && json.data.authority) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("ir_payment_requests").insert({
          authority: json.data.authority,
          user_id: userId,
          kind: data.kind,
          item_id: data.itemId,
          amount_toman: amountToman,
          coupon_code: data.couponCode ?? null,
          status: "pending",
        });

        return { redirectUrl: `${ZARINPAL_STARTPAY_URL}${json.data.authority}` };
      }

      const errObj = json.errors && !Array.isArray(json.errors) ? json.errors : null;
      const errMsg = errObj?.message ?? `ZarinPal error code: ${json.data?.code ?? "unknown"}`;
      return { error: errMsg };
    } catch (err) {
      console.error("[ZarinPal createIrCheckout error]", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        merchantIdMasked: merchantId ? `${merchantId.slice(0, 8)}...` : "MISSING",
        amountToman: data.amountToman,
        callbackUrl,
      });
      return { error: "خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید." };
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

export const irCheckoutSchema = inputSchema;
