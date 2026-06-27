// Tiny helper kept separate from stripe.ts so consumers that only need the
// env name (sandbox / live) don't pull `@stripe/stripe-js` (~150 KB) into
// their bundle. `stripe.ts` re-exports this for back-compat.

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

// Derive env from the publishable token prefix so the client publishable key
// and the server secret key are ALWAYS in the same mode. Forcing "live" here
// while the dev build still ships pk_test_ causes Stripe to reject sessions
// with "Something went wrong".
export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_live_")) return "live";
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  throw new Error(
    "Payments are not configured for this build. Complete payments go-live to enable production checkout.",
  );
}

export function getStripeClientToken(): string | undefined {
  return clientToken;
}
