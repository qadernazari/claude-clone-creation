import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PromoBanner = {
  code: string;
  description: string;
  discountLabel: string;
  discountType: "percent" | "amount";
  discountValue: number;
  currency: string | null;
  expiresAt: string | null;
};

/**
 * Public listing of currently-promotable coupons. A coupon is "promotable"
 * when it is active, not expired, not fully redeemed, has a non-empty
 * description, and applies to the requested checkout context.
 */
export const listPromoBanners = createServerFn({ method: "GET" })
  .inputValidator((data: { context: "membership" | "ticket"; filmId?: string }) =>
    z
      .object({
        context: z.enum(["membership", "ticket"]),
        filmId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ banners: PromoBanner[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { couponDiscountLabel } = await import("@/lib/coupons.server");

    const nowIso = new Date().toISOString();

    let query = supabaseAdmin
      .from("coupons")
      .select(
        "code, description, discount_type, discount_value, currency, applies_to, film_id, max_redemptions, redemptions_count, expires_at",
      )
      .eq("active", true)
      .not("description", "is", null)
      .in("applies_to", ["all", data.context])
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data.context === "ticket" && data.filmId) {
      query = query.or(`film_id.is.null,film_id.eq.${data.filmId}`);
    } else {
      query = query.is("film_id", null);
    }

    const { data: rows, error } = await query;
    if (error || !rows) return { banners: [] };

    const banners: PromoBanner[] = rows
      .filter((r) => {
        const desc = (r.description ?? "").trim();
        if (!desc) return false;
        if (r.max_redemptions != null && r.redemptions_count >= r.max_redemptions) return false;
        return true;
      })
      .map((r) => ({
        code: r.code,
        description: (r.description ?? "").trim(),
        discountLabel: couponDiscountLabel({
          id: "",
          code: r.code,
          discount_type: r.discount_type,
          discount_value: r.discount_value,
          currency: r.currency,
          applies_to: r.applies_to,
          film_id: r.film_id,
          max_redemptions: r.max_redemptions,
          redemptions_count: r.redemptions_count,
          expires_at: r.expires_at,
          active: true,
        }),
        discountType: r.discount_type,
        discountValue: r.discount_value,
        currency: r.currency,
        expiresAt: r.expires_at,
      }));

    return { banners };
  });
