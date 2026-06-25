import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripeClientToken, getStripeEnvironment } from "./stripe-env";

// Re-export so existing imports `from "@/lib/stripe"` keep working.
export { getStripeEnvironment };

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    // Validate env (throws if not configured).
    getStripeEnvironment();
    stripePromise = loadStripe(getStripeClientToken() as string);
  }
  return stripePromise;
}
