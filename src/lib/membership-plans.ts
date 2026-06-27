// Single source of truth for the 4 membership bundle tiers.
// All bundles are one-time pre-paid charges (no auto-renewal).

export type MembershipPlanId = "1mo" | "3mo" | "6mo" | "12mo";

export interface MembershipPlan {
  id: MembershipPlanId;
  months: number;
  /** Stripe price lookup_key (USD, international). */
  stripeLookupKey: string;
  /** Base USD price in cents (matches Stripe). */
  priceCentsUsd: number;
  /** Discount % vs the 1-month base, rounded. */
  discountPercent: number;
  /** Marketing flags */
  bestValue?: boolean;
  popular?: boolean;
}

export const MEMBERSHIP_BASE_TOMAN = 99_000;
export const MEMBERSHIP_BASE_CENTS = 499;

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: "1mo",  months: 1,  stripeLookupKey: "membership_1mo",  priceCentsUsd: 499,  discountPercent: 0 },
  { id: "3mo",  months: 3,  stripeLookupKey: "membership_3mo",  priceCentsUsd: 999,  discountPercent: 33, popular: true },
  { id: "6mo",  months: 6,  stripeLookupKey: "membership_6mo",  priceCentsUsd: 1799, discountPercent: 40 },
  { id: "12mo", months: 12, stripeLookupKey: "membership_12mo", priceCentsUsd: 2999, discountPercent: 50, bestValue: true },
];

const TOMAN_PRICES: Record<MembershipPlanId, number> = {
  "1mo":  99_000,
  "3mo":  199_000,
  "6mo":  399_000,
  "12mo": 699_000,
};

export function getPlan(id: MembershipPlanId): MembershipPlan {
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown membership plan: ${id}`);
  return plan;
}

/** Exact Toman price per plan (hardcoded lookup, not formula-derived). */
export function tomanPriceForPlan(plan: MembershipPlan, _baseToman = MEMBERSHIP_BASE_TOMAN): number {
  return TOMAN_PRICES[plan.id];
}
