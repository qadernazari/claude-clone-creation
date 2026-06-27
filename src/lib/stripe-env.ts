// Tiny helper kept separate from stripe.ts so consumers that only need the
// env name (sandbox / live) don't pull `@stripe/stripe-js` (~150 KB) into
// their bundle. `stripe.ts` re-exports this for back-compat.

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

// Production app: always use Stripe LIVE. No sandbox/test fallback.
export function getStripeEnvironment(): StripeEnv {
  return "live";
}

export function getStripeClientToken(): string | undefined {
  return clientToken;
}
