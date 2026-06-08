import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ValidateResult =
  | {
      ok: true;
      code: string;
      discountLabel: string;
      discountType: "percent" | "amount";
      discountValue: number;
      currency: string | null;
    }
  | { ok: false; error: string };

/**
 * Preview a coupon before mounting the embedded checkout. Returns the
 * resolved discount info (no Stripe coupon is created here).
 */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; context: "membership" | "ticket"; filmId?: string }) =>
    z
      .object({
        code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid coupon code"),
        context: z.enum(["membership", "ticket"]),
        filmId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ValidateResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { lookupCoupon, couponDiscountLabel } = await import("@/lib/coupons.server");

    const res = await lookupCoupon(supabaseAdmin as never, {
      code: data.code,
      context: data.context,
      filmId: data.filmId,
    });
    if (!res.ok) return { ok: false, error: res.error };

    return {
      ok: true,
      code: res.coupon.code,
      discountLabel: couponDiscountLabel(res.coupon),
      discountType: res.coupon.discount_type,
      discountValue: res.coupon.discount_value,
      currency: res.coupon.currency,
    };
  });
