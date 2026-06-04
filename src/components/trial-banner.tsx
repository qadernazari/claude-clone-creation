import { useLocale } from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/** Subtle banner shown sitewide when user is on an active trial with ≤3 days left. */
export function TrialBanner() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { trial, isMember } = useSubscription();

  if (!isMember || !trial || trial.status !== "active") return null;
  const days = daysUntil(trial.ends_at);
  if (days === null || days > 3) return null;

  const msg =
    days === 0
      ? fa
        ? "دوره آزمایشی شما امروز پایان می‌یابد."
        : "Your free trial ends today."
      : days === 1
        ? fa
          ? "دوره آزمایشی شما فردا پایان می‌یابد."
          : "Your membership trial expires tomorrow."
        : fa
          ? `${days} روز از دوره آزمایشی شما باقی‌مانده است.`
          : `You have ${days} days remaining in your free trial.`;

  return (
    <div className="border-b border-amber/15 bg-amber/[0.06] px-4 py-2 text-center text-[12px] text-cream/85">
      <span className="font-medium text-amber">{msg}</span>
      <a href="/account" className="ml-3 underline-offset-4 hover:underline">
        {fa ? "ادامه دسترسی بدون وقفه" : "Continue your access without interruption"}
      </a>
    </div>
  );
}
