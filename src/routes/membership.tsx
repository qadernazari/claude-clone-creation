import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { usePageOverlay } from "@/components/page-overlay";
import { useLocale } from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";
import { useIrMode } from "@/hooks/use-ir-mode";
import { loadCmsKey } from "@/lib/cms-client";
import { AcceptTrialButton } from "@/components/accept-trial-button";
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_BASE_TOMAN,
  tomanPriceForPlan,
  type MembershipPlanId,
  type MembershipPlan,
} from "@/lib/membership-plans";


const MembershipCheckout = lazy(() =>
  import("@/components/membership-checkout").then((m) => ({ default: m.MembershipCheckout })),
);

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — IRAN" },
      {
        name: "description",
        content:
          "Choose your IRAN membership. 1, 3, 6, or 12 months — unlimited streaming, save up to 20%.",
      },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  const { locale, num } = useLocale();
  const fa = locale === "fa";
  const { openPage } = usePageOverlay();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading, hasUsedTrial, isMember } = useSubscription();
  const irMode = useIrMode();
  const [baseToman, setBaseToman] = useState<number>(MEMBERSHIP_BASE_TOMAN);
  const [checkoutPlan, setCheckoutPlan] = useState<MembershipPlanId | null>(null);

  useEffect(() => {
    loadCmsKey<{ membershipPriceToman?: number }>("general_settings").then((d) => {
      if (d?.membershipPriceToman) setBaseToman(d.membershipPriceToman);
    });
  }, []);

  const benefits = useMemo(
    () =>
      fa
        ? [
            "تماشای نامحدود کل کاتالوگ",
            "کیفیت HD و زیرنویس فارسی",
            "بدون تبلیغات، در هر دستگاه",
            "بدون تمدید خودکار — کنترل کامل با شما",
          ]
        : [
            "Unlimited access to the full catalog",
            "HD streaming with Persian subtitles",
            "Ad-free, on every device",
            "No auto-renewal — you stay in control",
          ],
    [fa],
  );

  const handleChoose = (planId: MembershipPlanId) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/membership" } });
      return;
    }
    setCheckoutPlan(planId);
  };

  const showTrialBanner = !isAuthLoading && !!user && !hasUsedTrial && !isMember;

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-24 sm:px-6 md:pt-32">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-amber/90">
            {fa ? "عضویت ایران" : "IRAN Membership"}
          </div>
          <h1
            className={`mt-3 text-3xl text-cream-bright sm:text-5xl ${fa ? "font-vazir" : "font-display"}`}
          >
            {fa ? "پلن خود را انتخاب کنید" : "Choose your plan"}
          </h1>
          <p className="mt-4 text-sm text-cream/65 sm:text-base">
            {fa
              ? "پرداخت یکبار برای ۱، ۳، ۶ یا ۱۲ ماه. بدون تمدید خودکار. هر زمان لغو کنید."
              : "One-time payment for 1, 3, 6, or 12 months. No auto-renewal. Cancel anytime."}
          </p>
        </header>

        {showTrialBanner && (
          <section className="mx-auto mt-10 max-w-2xl rounded-md border border-amber/25 bg-amber/5 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
              <div className="flex-1">
                <h2 className={`text-sm font-medium text-cream-bright ${fa ? "font-vazir" : ""}`}>
                  {fa ? "۷ روز رایگان امتحان کنید" : "Try 7 days free"}
                </h2>
                <p className="mt-1 text-xs text-cream/65">
                  {fa
                    ? "بدون نیاز به اطلاعات پرداخت. در صورت تمایل بعدا پلن انتخاب کنید."
                    : "No payment details required. Pick a plan later if you like it."}
                </p>
              </div>
              <AcceptTrialButton
                label={fa ? "شروع رایگان" : "Start free trial"}
                className="inline-flex shrink-0 items-center rounded-md bg-amber px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink hover:bg-amber/90 disabled:opacity-70"
              />
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBERSHIP_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              fa={fa}
              irMode={irMode}
              baseToman={baseToman}
              num={num}
              onChoose={() => handleChoose(plan.id)}
            />
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-2xl">
          <h2 className={`text-sm uppercase tracking-[0.18em] text-cream/55 ${fa ? "font-vazir" : ""}`}>
            {fa ? "شامل همه پلن‌ها" : "Included with every plan"}
          </h2>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-cream/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-center text-xs text-cream/45">
          {fa ? (
            <>
              با خرید عضویت، شما{" "}
              <button type="button" onClick={() => openPage("terms")} className="underline hover:text-cream/80">
                شرایط استفاده
              </button>{" "}
              را می‌پذیرید.
            </>
          ) : (
            <>
              By purchasing a plan, you agree to our{" "}
              <button type="button" onClick={() => openPage("terms")} className="underline hover:text-cream/80">
                Terms of Service
              </button>
              .
            </>
          )}
        </p>
      </main>
      <SiteFooter />

      {checkoutPlan && (
        <Suspense fallback={null}>
          <MembershipCheckout
            plan={checkoutPlan}
            returnUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&membership=1`
                : ""
            }
            onClose={() => setCheckoutPlan(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  fa,
  irMode,
  baseToman,
  num,
  onChoose,
}: {
  plan: MembershipPlan;
  fa: boolean;
  irMode: boolean;
  baseToman: number;
  num: (n: number) => string;
  onChoose: () => void;
}) {
  const tomanTotal = tomanPriceForPlan(plan, baseToman);
  const tomanPerMonth = Math.round(tomanTotal / plan.months / 1000) * 1000;
  const usdTotal = plan.priceCentsUsd / 100;
  const usdPerMonth = usdTotal / plan.months;

  const totalLabel = irMode
    ? `${num(tomanTotal)} ${fa ? "تومان" : "Toman"}`
    : `$${usdTotal.toFixed(2)}`;
  const perMonthLabel = irMode
    ? `${num(tomanPerMonth)} ${fa ? "تومان / ماه" : "Toman / mo"}`
    : `$${usdPerMonth.toFixed(2)} / mo`;

  const monthsLabel = fa
    ? `${num(plan.months)} ${plan.months === 1 ? "ماه" : "ماه"}`
    : `${plan.months} ${plan.months === 1 ? "Month" : "Months"}`;

  const highlight = plan.bestValue || plan.popular;
  const badge = plan.bestValue
    ? fa
      ? "بهترین ارزش"
      : "Best value"
    : plan.popular
      ? fa
        ? "محبوب"
        : "Popular"
      : null;

  return (
    <div
      className={`relative flex flex-col rounded-md border p-5 transition ${
        plan.bestValue
          ? "border-amber/60 bg-amber/[0.04] shadow-[0_0_0_1px_rgba(224,182,107,0.25)]"
          : highlight
            ? "border-cream/30 bg-bg-1"
            : "border-cream/12 bg-bg-1/60 hover:border-cream/25"
      }`}
    >
      {badge && (
        <div
          className={`absolute -top-2.5 ltr:left-4 rtl:right-4 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            plan.bestValue ? "bg-amber text-ink" : "bg-cream/15 text-cream-bright"
          }`}
        >
          {badge}
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className={`text-lg text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {monthsLabel}
        </h3>
        {plan.discountPercent > 0 && (
          <span className="text-[11px] font-medium text-amber">
            {fa ? `صرفه‌جویی ٪${num(plan.discountPercent)}` : `Save ${plan.discountPercent}%`}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl font-semibold text-cream-bright">{totalLabel}</div>
        <div className="mt-0.5 text-xs text-cream/55">{perMonthLabel}</div>
      </div>

      <button
        type="button"
        onClick={onChoose}
        className={`mt-6 inline-flex h-11 items-center justify-center rounded-md text-[12px] font-bold uppercase tracking-[0.08em] transition ${
          plan.bestValue
            ? "bg-amber text-ink hover:bg-amber/90"
            : "border border-cream/25 text-cream hover:bg-cream/5"
        }`}
      >
        {fa ? "انتخاب" : "Choose"}
      </button>
    </div>
  );
}
