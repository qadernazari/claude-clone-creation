import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/hooks/use-subscription";
import { useLocale } from "@/lib/i18n";
import { getStripeEnvironment } from "@/lib/stripe";
import { createMembershipPortalSession } from "@/lib/membership.functions";
import { MembershipCheckout } from "@/components/membership-checkout";

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
  const { subscription: sub, isMember, isLoading } = useSubscription();
  const openPortal = useServerFn(createMembershipPortalSession);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const t = {
    title: fa ? "عضویت" : "Membership",
    none: fa ? "هنوز عضو نیستید." : "You're not a member yet.",
    noneSub: fa
      ? "با عضویت، تمام آثار قابل تماشا را نامحدود ببینید."
      : "Unlock unlimited streaming with an IRAN membership.",
    start: fa ? "شروع رایگان ۷ روزه" : "Accept Free Trial",
    manage: fa ? "مدیریت اشتراک" : "Manage subscription",
    statusActive: fa ? "فعال" : "Active",
    statusTrial: fa ? "دوره آزمایشی" : "Trial",
    statusPastDue: fa ? "پرداخت ناموفق" : "Payment failed",
    statusCanceled: fa ? "لغو شده" : "Canceled",
    nextBill: fa ? "تمدید بعدی" : "Renews on",
    accessUntil: fa ? "دسترسی تا" : "Access until",
    trialEnds: fa ? "پایان دوره آزمایشی" : "Trial ends",
    canceledNote: fa
      ? "اشتراک شما در پایان دوره فعلی لغو می‌شود."
      : "Your subscription will end at the current period.",
    pastDueNote: fa
      ? "آخرین پرداخت ناموفق بود. برای ادامه، روش پرداخت را به‌روزرسانی کنید."
      : "Your last payment failed. Update your payment method to keep access.",
    daysLeft: (n: number) =>
      fa ? `${n} روز باقی‌مانده` : `${n} day${n === 1 ? "" : "s"} left`,
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
        <p className="mt-2 text-sm text-cream/70">{t.none}</p>
        <p className="mt-1 text-xs text-cream/55">{t.noneSub}</p>
        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          className="mt-5 inline-flex items-center rounded-full bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90"
        >
          {t.start}
        </button>
        {checkoutOpen && (
          <MembershipCheckout
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&membership=1`}
            onClose={() => setCheckoutOpen(false)}
          />
        )}
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
            className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-widest ${statusTone}`}
          >
            {statusLabel}
            {isTrial && trialDays !== null && trialDays > 0 ? ` · ${t.daysLeft(trialDays)}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePortal}
          disabled={loadingPortal}
          className="rounded-full border border-cream/25 px-4 py-2 text-sm text-cream hover:bg-cream/5 disabled:opacity-60"
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
