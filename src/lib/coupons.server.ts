// Server-only coupon helpers. Imported only by server functions.
import type { createStripeClient } from "@/lib/stripe.server";

export type CouponContext = "membership" | "ticket";

export type ResolvedCoupon = {
  couponId: string;
  code: string;
  stripeCouponId: string;
  discountLabel: string;
  amountOff: number | null;
  percentOff: number | null;
};

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "amount";
  discount_value: number;
  currency: string | null;
  applies_to: "membership" | "ticket" | "all";
  film_id: string | null;
  max_redemptions: number | null;
  redemptions_count: number;
  expires_at: string | null;
  active: boolean;
};

export type CouponLookupResult =
  | { ok: true; coupon: CouponRow }
  | { ok: false; error: string };

type SupabaseAdmin = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: CouponRow | null; error: { message: string } | null }>;
      };
    };
    update: (vals: Partial<CouponRow>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
    insert: (vals: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

/** Look up a coupon by code and validate against the checkout context. */
export async function lookupCoupon(
  supabaseAdmin: SupabaseAdmin,
  args: { code: string; context: CouponContext; filmId?: string | null },
): Promise<CouponLookupResult> {
  // Normalize input and strip anything that isn't alphanumeric/dash/underscore so
  // LIKE-wildcard injection (e.g. "%") is impossible — we then do an exact match.
  const code = args.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code) return { ok: false, error: "Invalid coupon code" };

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, currency, applies_to, film_id, max_redemptions, redemptions_count, expires_at, active",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Invalid coupon code" };
  if (!data.active) return { ok: false, error: "This coupon is no longer active" };
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "This coupon has expired" };
  }
  if (data.max_redemptions != null && data.redemptions_count >= data.max_redemptions) {
    return { ok: false, error: "This coupon is fully redeemed" };
  }
  if (data.applies_to !== "all" && data.applies_to !== args.context) {
    return {
      ok: false,
      error:
        args.context === "membership"
          ? "Not valid on memberships"
          : "Not valid on film tickets",
    };
  }
  if (
    args.context === "ticket" &&
    data.film_id &&
    args.filmId &&
    data.film_id !== args.filmId
  ) {
    return { ok: false, error: "Not valid for this film" };
  }

  return { ok: true, coupon: data };
}

/** Create a one-shot Stripe coupon mirroring our DB coupon. */
export async function createStripeCoupon(
  stripe: ReturnType<typeof createStripeClient>,
  coupon: CouponRow,
): Promise<{ stripeCouponId: string; amountOff: number | null; percentOff: number | null }> {
  if (coupon.discount_type === "percent") {
    const c = await stripe.coupons.create({
      percent_off: coupon.discount_value,
      duration: "once",
      name: `${coupon.code} (${coupon.discount_value}% off)`,
      metadata: { coupon_id: coupon.id, code: coupon.code },
    });
    return { stripeCouponId: c.id, amountOff: null, percentOff: coupon.discount_value };
  }
  // Stripe coupons in USD use cents; we store amount_off in smallest currency unit already.
  // Toman coupons aren't supported by Stripe USD checkout — fall back to percent equivalent or skip.
  const currency = (coupon.currency ?? "usd").toLowerCase();
  if (currency !== "usd") {
    throw new Error("Only USD fixed-amount coupons are supported at checkout");
  }
  const c = await stripe.coupons.create({
    amount_off: coupon.discount_value,
    currency: "usd",
    duration: "once",
    name: `${coupon.code} ($${(coupon.discount_value / 100).toFixed(2)} off)`,
    metadata: { coupon_id: coupon.id, code: coupon.code },
  });
  return { stripeCouponId: c.id, amountOff: coupon.discount_value, percentOff: null };
}

/**
 * After a Checkout Session is created, record the redemption and bump the
 * counter. Done at creation time (not on payment success) for simplicity —
 * abandoned carts will still hold a redemption slot. Acceptable for v1.
 */
export async function recordRedemption(
  supabaseAdmin: SupabaseAdmin,
  args: {
    couponId: string;
    userId: string;
    sessionId: string;
    stripeCouponId: string;
    context: CouponContext;
    filmId?: string | null;
    amountOff: number | null;
    currentCount: number;
  },
): Promise<void> {
  await supabaseAdmin.from("coupon_redemptions").insert({
    coupon_id: args.couponId,
    user_id: args.userId,
    stripe_session_id: args.sessionId,
    stripe_coupon_id: args.stripeCouponId,
    context: args.context,
    film_id: args.filmId ?? null,
    amount_off: args.amountOff,
  });
  await supabaseAdmin
    .from("coupons")
    .update({ redemptions_count: args.currentCount + 1 })
    .eq("id", args.couponId);
}

export function couponDiscountLabel(c: CouponRow): string {
  if (c.discount_type === "percent") return `${c.discount_value}% off`;
  const cur = (c.currency ?? "usd").toUpperCase();
  if (cur === "USD") return `$${(c.discount_value / 100).toFixed(2)} off`;
  if (cur === "TOMAN") return `${c.discount_value.toLocaleString()} T off`;
  return `${c.discount_value} ${cur} off`;
}
