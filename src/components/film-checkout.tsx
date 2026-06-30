import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createFilmCheckout } from "@/lib/payments.functions";
import { CouponField } from "@/components/coupon-field";
import { IrPayPanel } from "@/components/ir-pay-panel";
import { useIrMode } from "@/hooks/use-ir-mode";

import { useLocale } from "@/lib/i18n";

interface FilmCheckoutProps {
  filmSlug: string;
  filmId?: string;
  priceToman?: number;
  returnUrl: string;
  onClose: () => void;
}

export function FilmCheckout({ filmSlug, filmId, priceToman, returnUrl, onClose }: FilmCheckoutProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const irMode = useIrMode();
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(null);
  const [started, setStarted] = useState(false);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createFilmCheckout({
      data: {
        filmSlug,
        returnUrl,
        environment: getStripeEnvironment(),
        ...(applied && { couponCode: applied.code }),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [filmSlug, returnUrl, applied]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-bg-0/85 backdrop-blur sm:items-start sm:px-4 sm:py-10"
      onClick={onClose}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="relative w-full max-w-2xl rounded-t-2xl bg-bg-1 p-2 shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-md bg-bg-0 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15 sm:-top-3 sm:-right-3 sm:h-9 sm:w-9"
        >
          ✕
        </button>

        {irMode ? (
          <IrPayPanel
            kind="ticket"
            itemId={filmId ?? filmSlug}
            amountToman={priceToman}
            couponCode={applied?.code}
            onClose={onClose}
          />
        ) : !started ? (
          <div className="p-6 sm:p-8">
            <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {fa ? "خرید بلیت" : "Buy ticket"}
            </h2>
            <p className="mt-2 text-sm text-cream/65">
              {fa
                ? "پس از پرداخت، فیلم برای مدت محدود قابل تماشاست."
                : "After payment you'll have time-limited access to stream this film."}
            </p>

            <div className="mt-6">
              <p className="mb-2 text-[11px] uppercase tracking-widest text-cream/55">
                {fa ? "کد تخفیف (اختیاری)" : "Promo code (optional)"}
              </p>
              {/* coupon field below — promo banner list removed */}
              <CouponField
                context="ticket"
                filmId={filmId}
                fa={fa}
                applied={applied}
                onApply={setApplied}
              />
            </div>

            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-6 w-full rounded-md bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90"
            >
              {fa ? "ادامه به پرداخت" : "Continue to payment"}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
