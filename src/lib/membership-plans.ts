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

export const MEMBERSHIP_BASE_TOMAN = 290_000;
export const MEMBERSHIP_BASE_CENTS = 999;

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: "1mo",  months: 1,  stripeLookupKey: "membership_1mo",  priceCentsUsd: 999,  discountPercent: 0 },
  { id: "3mo",  months: 3,  stripeLookupKey: "membership_3mo",  priceCentsUsd: 2847, discountPercent: 5,  popular: true },
  { id: "6mo",  months: 6,  stripeLookupKey: "membership_6mo",  priceCentsUsd: 5395, discountPercent: 10 },
  { id: "12mo", months: 12, stripeLookupKey: "membership_12mo", priceCentsUsd: 9590, discountPercent: 20, bestValue: true },
];

export function getPlan(id: MembershipPlanId): MembershipPlan {
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown membership plan: ${id}`);
  return plan;
}

/** Compute Toman price for a plan from a base monthly Toman price. */
export function tomanPriceForPlan(plan: MembershipPlan, baseToman = MEMBERSHIP_BASE_TOMAN): number {
  const raw = baseToman * plan.months * (1 - plan.discountPercent / 100);
  return Math.round(raw / 1000) * 1000; // round to nearest 1,000 toman
}
