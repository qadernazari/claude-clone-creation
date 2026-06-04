import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useMemo, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createMembershipCheckout } from "@/lib/membership.functions";
import { CouponField } from "@/components/coupon-field";
import { PromoBannerList } from "@/components/promo-banner";
import { useLocale } from "@/lib/i18n";

interface MembershipCheckoutProps {
  returnUrl: string;
  onClose: () => void;
}

export function MembershipCheckout({ returnUrl, onClose }: MembershipCheckoutProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(null);
  const [started, setStarted] = useState(false);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createMembershipCheckout({
      data: {
        returnUrl,
        environment: getStripeEnvironment(),
        ...(applied && { couponCode: applied.code }),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [returnUrl, applied]);

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
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-bg-0 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15 sm:-top-3 sm:-right-3 sm:h-9 sm:w-9"
        >
          ✕
        </button>

        {!started ? (
          <div className="p-6 sm:p-8">
            <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {fa ? "عضویت ماهانه" : "Monthly membership"}
            </h2>
            <p className="mt-2 text-sm text-cream/65">
              {fa
                ? "۷ روز رایگان، سپس پرداخت ماهانه. هر زمان لغو کنید."
                : "7-day free trial, then billed monthly. Cancel anytime."}
            </p>

            <div className="mt-6">
              <p className="mb-2 text-[11px] uppercase tracking-widest text-cream/55">
                {fa ? "کد تخفیف (اختیاری)" : "Promo code (optional)"}
              </p>
              {!applied && (
                <div className="mb-3">
                  <PromoBannerList context="membership" fa={fa} onApply={setApplied} />
                </div>
              )}
              <CouponField
                context="membership"
                fa={fa}
                applied={applied}
                onApply={setApplied}
              />
            </div>

            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-6 w-full rounded-full bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90"
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
