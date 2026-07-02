import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createMembershipCheckout } from "@/lib/membership.functions";
import { CouponField } from "@/components/coupon-field";
import { IrPayPanel } from "@/components/ir-pay-panel";
import { useIrMode } from "@/hooks/use-ir-mode";
import { useSubscription } from "@/hooks/use-subscription";
import { useLocale } from "@/lib/i18n";
import { getPlan, tomanPriceForPlan, type MembershipPlanId } from "@/lib/membership-plans";


interface MembershipCheckoutProps {
  returnUrl: string;
  onClose: () => void;
  plan: MembershipPlanId;
}

export function MembershipCheckout({ returnUrl, onClose, plan: planId }: MembershipCheckoutProps) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const irMode = useIrMode();
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(null);
  const [started, setStarted] = useState(false);
  const plan = getPlan(planId);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createMembershipCheckout({
      data: {
        returnUrl,
        environment: getStripeEnvironment(),
        plan: planId,
        ...(applied && { couponCode: applied.code }),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [returnUrl, applied, planId]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const planAmountToman = tomanPriceForPlan(plan);
  const monthsLabel = fa
    ? plan.months === 1 ? "یک ماه" : `${plan.months} ماه`
    : `${plan.months} ${plan.months === 1 ? "Month" : "Months"}`;

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
          className="absolute top-3 z-10 grid h-9 w-9 place-items-center rounded-md bg-bg-0/80 text-cream/80 hover:text-cream-bright shadow-lg border border-cream/15 ltr:right-3 rtl:left-3"
        >
          ✕
        </button>

        {irMode ? (
          <IrPayPanel
            kind="membership"
            itemId={planId}
            amountToman={planAmountToman}
            couponCode={applied?.code}
            onClose={onClose}
          />
        ) : !started ? (
          <div className="p-6 sm:p-8">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber/90">
              {fa ? "عضویت" : "IRAN Membership"}
            </div>
            <h2 className={`mt-1 text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {monthsLabel}
            </h2>
            <p className="mt-2 text-sm text-cream/65">
              {fa
                ? "پرداخت یک‌بار. بدون تمدید خودکار. هر وقت خواستید پلن جدید بخرید."
                : "One-time payment. No auto-renewal. Buy another bundle anytime."}
            </p>

            <div className="mt-6">
              <p className="mb-2 text-[11px] uppercase tracking-widest text-cream/55">
                {fa ? "کد تخفیف — اختیاری" : "Promo code (optional)"}
              </p>
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
              className="mt-6 w-full rounded-md bg-amber px-5 py-3 text-sm font-medium text-bg-0 hover:bg-amber/90"
            >
              {fa ? "رفتن به درگاه پرداخت" : "Continue to payment"}
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
