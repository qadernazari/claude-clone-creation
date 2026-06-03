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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg-0/85 backdrop-blur px-4 py-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-bg-1 p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute -top-3 -right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-bg-0 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15"
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
