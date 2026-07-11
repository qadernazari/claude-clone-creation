import type { Stripe } from "@stripe/stripe-js";
import { getStripeClientToken, getStripeEnvironment } from "./stripe-env";

// Re-export so existing imports `from "@/lib/stripe"` keep working.
export { getStripeEnvironment };

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Lazy-loads @stripe/stripe-js (~30 KB gzipped) only when a checkout
 * flow actually needs it. The top-level import is intentionally omitted
 * so the SDK never lands in a route chunk that merely references
 * getStripe from a module scope — it fetches on first call.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    // Validate env (throws if not configured).
    getStripeEnvironment();
    stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) =>
      loadStripe(getStripeClientToken() as string),
    );
  }
  return stripePromise;
}
