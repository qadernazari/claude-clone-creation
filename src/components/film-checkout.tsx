import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createFilmCheckout } from "@/lib/payments.functions";

interface FilmCheckoutProps {
  filmSlug: string;
  returnUrl: string;
  onClose: () => void;
}

export function FilmCheckout({ filmSlug, returnUrl, onClose }: FilmCheckoutProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createFilmCheckout({
      data: { filmSlug, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [filmSlug, returnUrl]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-bg-0/85 backdrop-blur sm:items-start sm:px-4 sm:py-10"
      onClick={onClose}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-t-2xl bg-bg-1 p-2 shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-bg-0 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15 sm:-top-3 sm:-right-3 sm:h-9 sm:w-9"
        >
          ✕
        </button>
        <div className="overflow-hidden rounded-lg bg-white">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
