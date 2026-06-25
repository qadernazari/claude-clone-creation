import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

import { MEMBERSHIP_PLANS, getPlan, type MembershipPlanId } from "@/lib/membership-plans";

const PLAN_IDS = MEMBERSHIP_PLANS.map((p) => p.id) as [MembershipPlanId, ...MembershipPlanId[]];

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createMembershipCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv; plan: MembershipPlanId; couponCode?: string }) =>
    z.object({
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
      plan: z.enum(PLAN_IDS),
      couponCode: z.string().min(1).max(64).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { userId, claims } = context;
      const email = (claims as { email?: string })?.email;

      const stripe = createStripeClient(data.environment);
      const plan = getPlan(data.plan);

      // Resolve the membership price by lookup_key (stable across envs).
      const prices = await stripe.prices.list({
        lookup_keys: [plan.stripeLookupKey],
        active: true,
        limit: 1,
      });
      if (!prices.data.length) throw new Error("Membership price not configured");
      const price = prices.data[0];

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      // Resolve & validate coupon (if provided) BEFORE creating the session.
      let resolvedCoupon:
        | { couponId: string; stripeCouponId: string; amountOff: number | null; currentCount: number }
        | null = null;
      if (data.couponCode) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { lookupCoupon, createStripeCoupon } = await import("@/lib/coupons.server");
        const lookup = await lookupCoupon(supabaseAdmin as never, {
          code: data.couponCode,
          context: "membership",
        });
        if (!lookup.ok) return { error: lookup.error };
        const created = await createStripeCoupon(stripe, lookup.coupon);
        resolvedCoupon = {
          couponId: lookup.coupon.id,
          stripeCouponId: created.stripeCouponId,
          amountOff: created.amountOff,
          currentCount: lookup.coupon.redemptions_count,
        };
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        ...(resolvedCoupon && {
          discounts: [{ coupon: resolvedCoupon.stripeCouponId }],
        }),
        payment_intent_data: {
          description: `IRAN Membership · ${plan.months} ${plan.months === 1 ? "Month" : "Months"}`,
          metadata: { userId, kind: "membership_bundle", bundle_months: String(plan.months), plan_id: plan.id },
        },
        metadata: {
          userId,
          kind: "membership_bundle",
          bundle_months: String(plan.months),
          plan_id: plan.id,
          ...(resolvedCoupon && { coupon_id: resolvedCoupon.couponId }),
        },
      });

      if (resolvedCoupon) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { recordRedemption } = await import("@/lib/coupons.server");
        await recordRedemption(supabaseAdmin as never, {
          couponId: resolvedCoupon.couponId,
          userId,
          sessionId: session.id,
          stripeCouponId: resolvedCoupon.stripeCouponId,
          context: "membership",
          amountOff: resolvedCoupon.amountOff,
          currentCount: resolvedCoupon.currentCount,
        });
      }

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createMembershipPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) =>
    z.object({
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabase, userId } = context;
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!sub?.stripe_customer_id) return { error: "No active membership" };

      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
