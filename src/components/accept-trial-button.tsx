import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { activateTrial } from "@/lib/trial.functions";
import { useCurrentUserState, useSubscription } from "@/hooks/use-subscription";
import { useLocale } from "@/lib/i18n";

interface Props {
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

/**
 * Universal "Accept Free Trial" CTA.
 * - Signed out: links to /auth
 * - Signed in: activates the 90-day trial instantly (no credit card)
 */
export function AcceptTrialButton({ className, label, fullWidth }: Props) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { user, isLoading: isUserLoading } = useCurrentUserState();
  const { hasUsedTrial, isMember } = useSubscription();
  const qc = useQueryClient();
  const activate = useServerFn(activateTrial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const text = label ?? (fa ? "پذیرش آزمایش رایگان" : "Accept Free Trial");
  const baseCls =
    className ??
    "inline-flex h-10 items-center rounded-md bg-amber px-6 text-sm font-bold text-ink shadow-sm transition-all duration-200 hover:bg-amber-bright active:scale-95 disabled:opacity-60";

  const handleClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await activate();
      if ("error" in res) {
        setErr(fa ? "فعال‌سازی آزمایش رایگان ممکن نشد. دوباره تلاش کنید." : res.error);
      } else {
        // Refresh subscription/trial state across the app.
        await qc.invalidateQueries({ queryKey: ["subscription"] });
        await qc.invalidateQueries({ queryKey: ["my-trial"] });
      }
    } catch (e) {
      setErr(fa ? "خطایی رخ داد. دوباره تلاش کنید." : (e instanceof Error ? e.message : "Could not start trial"));
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <span
        className={`${baseCls}${fullWidth ? " w-full justify-center" : ""} pointer-events-none opacity-0`}
        aria-hidden
      >
        {text}
      </span>
    );
  }

  // Trial is one-per-account. If already used (or already a member), swap the
  // CTA to a Become a Member link so we never offer a second trial.
  if (user && (hasUsedTrial || isMember)) {
    if (isMember) return null;
    return (
      <Link
        to="/account"
        className={`${baseCls}${fullWidth ? " w-full justify-center" : ""}`}
      >
        {fa ? "تبدیل به عضو" : "Become a Member"}
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className={`${baseCls}${fullWidth ? " w-full justify-center" : ""}`}
      >
        {text}
      </Link>
    );
  }

  return (
    <div className={fullWidth ? "w-full" : "inline-block"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`${baseCls}${fullWidth ? " w-full justify-center" : ""}`}
      >
        {loading ? (fa ? "در حال فعال‌سازی…" : "Activating…") : text}
      </button>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
