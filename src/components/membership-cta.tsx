import { useLocale } from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";
import { AcceptTrialButton } from "./accept-trial-button";

/**
 * Subscription-aware header CTA. Extracted into its own module so the
 * site header can lazy-load it after first paint — keeps useSubscription
 * (two Supabase queries) and the trial server-fn off the critical path.
 */
export function MembershipCta() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { isMember, isLoading, hasUsedTrial } = useSubscription();

  if (isLoading || isMember) {
    return <div className="hidden h-10 w-[120px] shrink-0 sm:block" aria-hidden />;
  }

  if (hasUsedTrial) {
    const label = fa ? "عضویت" : "Become a Member";
    return (
      <div className="hidden shrink-0 sm:block">
        <a
          href="/membership"
          className="inline-flex h-10 items-center whitespace-nowrap rounded-md bg-amber px-5 text-[12px] font-bold uppercase tracking-[0.08em] leading-none text-ink shadow-sm transition-all duration-200 hover:bg-amber/90 active:scale-95"
        >
          {label}
        </a>
      </div>
    );
  }

  const label = fa ? "آزمایش رایگان" : "Free Trial";
  return (
    <div className="hidden shrink-0 sm:block">
      <AcceptTrialButton
        className="inline-flex h-10 items-center whitespace-nowrap rounded-md bg-cream px-5 text-[12px] font-bold uppercase tracking-[0.08em] leading-none text-ink shadow-sm transition-all duration-200 hover:bg-cream-bright active:scale-95 disabled:opacity-70"
        label={label}
      />
    </div>
  );
}
