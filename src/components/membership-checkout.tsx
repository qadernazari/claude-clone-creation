import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createMembershipCheckout } from "@/lib/membership.functions";
import { CouponField } from "@/components/coupon-field";
import { PromoBannerList } from "@/components/promo-banner";
import { useLocale } from "@/lib/i18n";
import { AcceptTrialButton } from "@/components/accept-trial-button";
import { useSubscription } from "@/hooks/use-subscription";

interface MembershipCheckoutProps {
  returnUrl: string;
  onClose: () => void;
}

export function MembershipCheckout({ returnUrl, onClose }: MembershipCheckoutProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(null);
  const [started, setStarted] = useState(false);
  const { hasUsedTrial, isMember } = useSubscription();
  const showTrialCta = !hasUsedTrial && !isMember;

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);


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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg-0/85 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-auto w-full max-w-lg rounded-2xl bg-bg-1 shadow-2xl ring-1 ring-cream/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-bg-0/80 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15"
        >
          ✕
        </button>


        {!started ? (
          <div className="p-6 sm:p-8">
            <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {fa ? "عضویت ماهانه" : "Monthly membership"}
            </h2>
            <p className="mt-2 text-sm text-cream/65">
              {showTrialCta
                ? fa
                  ? "هفت روز رایگان — بدون نیاز به اطلاعات پرداخت."
                  : "7 days free — no payment information required."
                : fa
                  ? "پرداخت ماهانه. هر زمان لغو کنید."
                  : "Billed monthly. Cancel anytime."}
            </p>

            {showTrialCta && (
              <div className="mt-6">
                <AcceptTrialButton
                  fullWidth
                  className="inline-flex items-center justify-center rounded-full bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90 disabled:opacity-70"
                  label={fa ? "پذیرش دوره آزمایشی رایگان" : "Accept Free Trial"}
                />
                <p className="mt-3 text-center text-xs text-cream/50">
                  {fa ? "یا" : "or"}
                </p>
              </div>
            )}

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
              className={`mt-6 w-full rounded-full ${showTrialCta ? "border border-cream/25 px-5 py-3 text-sm text-cream hover:bg-cream/5" : "bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90"}`}
            >
              {showTrialCta
                ? fa
                  ? "خرید مستقیم عضویت"
                  : "Skip trial, become a member"
                : fa
                  ? "ادامه به پرداخت"
                  : "Continue to payment"}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
