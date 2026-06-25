// Tiny helper kept separate from stripe.ts so consumers that only need the
// env name (sandbox / live) don't pull `@stripe/stripe-js` (~150 KB) into
// their bundle. `stripe.ts` re-exports this for back-compat.

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build. Complete payments go-live to enable production checkout.",
  );
}

export function getStripeClientToken(): string | undefined {
  return clientToken;
}
