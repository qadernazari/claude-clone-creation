import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/hooks/use-subscription";
import { useLocale } from "@/lib/i18n";
import { createMembershipPortalSession } from "@/lib/membership.functions";
import { getStripeEnvironment } from "@/lib/stripe-env";
import { AcceptTrialButton } from "@/components/accept-trial-button";

function fmtDate(iso: string | null, fa: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(fa ? "fa-IR" : "en-US", {
    dateStyle: "long",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function MembershipPanel() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { subscription: sub, trial, isMember, isTrialActive, isLoading, hasUsedTrial, isTrialExpired } = useSubscription();
  const openPortal = useServerFn(createMembershipPortalSession);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void useState; // keep import shape stable; no checkout modal here anymore

  const t = {
    title: fa ? "عضویت" : "Membership",
    none: fa ? "هنوز عضو نشده‌اید." : "You're not a member yet.",
    noneSub: fa
      ? "با عضویت، به همه آثار دسترسی نامحدود داشته باشید."
      : "Unlock unlimited streaming with an IRAN membership.",
    start: fa ? "شروع آزمایش رایگان" : "Accept Free Trial",
    manage: fa ? "مدیریت عضویت" : "Manage subscription",
    statusActive: fa ? "فعال" : "Active",
    statusTrial: fa ? "آزمایش رایگان" : "Trial",
    statusPastDue: fa ? "مشکل در پرداخت" : "Payment failed",
    statusCanceled: fa ? "پایان‌یافته" : "Canceled",
    nextBill: fa ? "تمدید در" : "Renews on",
    accessUntil: fa ? "دسترسی تا" : "Access until",
    trialEnds: fa ? "پایان آزمایش رایگان" : "Trial ends",
    canceledNote: fa
      ? "دسترسی شما تا پایان دوره جاری فعال است."
      : "Your subscription will end at the current period.",
    pastDueNote: fa
      ? "آخرین پرداخت انجام نشد. لطفاً روش پرداخت را به‌روز کنید."
      : "Your last payment failed. Update your payment method to keep access.",
    daysLeft: (n: number) =>
      fa ? `${n} روز مانده` : `${n} day${n === 1 ? "" : "s"} left`,
  };

  const handlePortal = async () => {
    setError(null);
    setLoadingPortal(true);
    try {
      const env = getStripeEnvironment();
      const returnUrl = `${window.location.origin}/account`;
      const res = await openPortal({
        data: { returnUrl, environment: env as "sandbox" | "live" },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open portal");
    } finally {
      setLoadingPortal(false);
    }
  };

  // Not a member yet → CTA
  if (!isLoading && !isMember) {
    return (
      <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
        <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {t.title}
        </h2>
        <p className="mt-2 text-sm text-cream/70">
          {isTrialExpired
            ? fa
              ? "آزمایش رایگان شما به پایان رسید. برای ادامه، عضو شوید."
              : "Your free trial has ended. Become a member to keep watching."
            : t.none}
        </p>
        {!isTrialExpired && (
          <p className="mt-1 text-xs text-cream/55">
            {fa
              ? "۳۰ روز دسترسی کامل — بدون نیاز به اطلاعات پرداختی."
              : "30 days of full access — no payment information required."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {!hasUsedTrial && (
            <AcceptTrialButton
              className="inline-flex items-center rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 disabled:opacity-70"
              label={t.start}
            />
          )}
          <Link
            to="/membership"
            className="inline-flex items-center rounded-md border border-cream/25 px-5 py-2.5 text-sm text-cream hover:bg-cream/5"
          >
            {fa ? "مشاهده پلن‌های عضویت" : "View plans"}
          </Link>
        </div>
      </section>
    );
  }

  // In-app free trial (no Stripe subscription yet) — show trial status.
  if (!sub && isTrialActive && trial) {
    const days = daysUntil(trial.ends_at);
    return (
      <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {t.title}
            </h2>
            <span className="mt-2 inline-flex items-center rounded-md border border-amber/30 bg-amber/15 px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-amber">
              {fa ? "آزمایش رایگان فعال" : "Free Trial Active"}
              {days !== null && days > 0 ? ` · ${t.daysLeft(days)}` : ""}
            </span>
          </div>
          <Link
            to="/membership"
            className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90"
          >
            {fa ? "تبدیل به عضو" : "Become a member"}
          </Link>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-cream/55">
              {fa ? "شروع از" : "Started on"}
            </dt>
            <dd className="mt-1 text-cream-bright">{fmtDate(trial.started_at, fa)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-cream/55">
              {t.trialEnds}
            </dt>
            <dd className="mt-1 text-cream-bright">{fmtDate(trial.ends_at, fa)}</dd>
          </div>
        </dl>
      </section>
    );
  }

  if (!sub) {
    return null;
  }

  const isTrial = sub.status === "trialing";
  const isPastDue = sub.status === "past_due";
  const isCanceledScheduled =
    sub.cancel_at_period_end || sub.status === "canceled";

  const trialDays = isTrial ? daysUntil(sub.trial_end) : null;

  const statusLabel = isTrial
    ? t.statusTrial
    : isPastDue
      ? t.statusPastDue
      : isCanceledScheduled
        ? t.statusCanceled
        : t.statusActive;

  const statusTone = isTrial
    ? "bg-amber/15 text-amber border-amber/30"
    : isPastDue
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : isCanceledScheduled
        ? "bg-cream/10 text-cream/70 border-cream/20"
        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  return (
    <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {t.title}
          </h2>
          <span
            className={`mt-2 inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] uppercase tracking-widest ${statusTone}`}
          >
            {statusLabel}
            {isTrial && trialDays !== null && trialDays > 0 ? ` · ${t.daysLeft(trialDays)}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePortal}
          disabled={loadingPortal}
          className="rounded-md border border-cream/25 px-4 py-2 text-sm text-cream hover:bg-cream/5 disabled:opacity-60"
        >
          {loadingPortal ? "…" : t.manage}
        </button>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
        {isTrial && sub.trial_end && (
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-cream/55">
              {t.trialEnds}
            </dt>
            <dd className="mt-1 text-cream-bright">{fmtDate(sub.trial_end, fa)}</dd>
          </div>
        )}
        {sub.current_period_end && (
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-cream/55">
              {isCanceledScheduled ? t.accessUntil : t.nextBill}
            </dt>
            <dd className="mt-1 text-cream-bright">
              {fmtDate(sub.current_period_end, fa)}
            </dd>
          </div>
        )}
      </dl>

      {isCanceledScheduled && (
        <p className="mt-4 text-xs text-cream/60">{t.canceledNote}</p>
      )}
      {isPastDue && (
        <p className="mt-4 text-xs text-destructive">{t.pastDueNote}</p>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
