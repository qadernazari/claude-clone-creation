import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { useCurrentUserState } from "@/hooks/use-subscription";

type SubInfo = {
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean | null;
} | null;

export function AuthMenu() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { user, isLoading: isUserLoading } = useCurrentUserState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sub, setSub] = useState<SubInfo>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setSub(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    supabase
      .from("subscriptions")
      .select("status, current_period_end, trial_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSub((data as SubInfo) ?? null));
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  const trialDaysLeft = (() => {
    if (!sub || sub.status !== "trialing" || !sub.trial_end) return null;
    const ms = new Date(sub.trial_end).getTime() - Date.now();
    if (ms <= 0) return null;
    return Math.max(1, Math.ceil(ms / 86400000));
  })();
  const pastDue = sub?.status === "past_due";
  if (isUserLoading) {
    return (
      <div className="flex w-[78px] justify-end" aria-hidden>
        <span className="h-10 w-10 rounded-full bg-cream/10 opacity-0" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-[78px] justify-end">
        <Link
          to="/auth"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-cream/20 px-4 py-2 text-sm text-cream/90 hover:bg-cream/10 transition-colors"
        >
          {fa ? "ورود" : "Sign in"}
        </Link>
      </div>
    );
  }

  const initial = (user.user_metadata?.full_name || user.email || "?")[0]?.toUpperCase();

  return (
    <div className="relative flex w-[78px] justify-end" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative h-10 w-10 rounded-full bg-cream/10 text-cream text-sm font-medium hover:bg-cream/20 transition-colors"
        aria-label="Account menu"
      >
        {initial}
        {(trialDaysLeft !== null || pastDue) && (
          <span
            className={`absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg-0 ${pastDue ? "bg-red-500" : "bg-amber"}`}
            aria-hidden
          />
        )}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-cream/15 bg-bg-1 p-1 shadow-lg z-50">
          <div className="px-3 py-2 text-xs text-cream/60 truncate">{user.email}</div>
          {trialDaysLeft !== null && (
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="mx-1 mb-1 block rounded-sm bg-amber/15 px-3 py-2 text-xs text-amber hover:bg-amber/25 transition-colors"
            >
              {fa
                ? `${trialDaysLeft} روز از دوره آزمایشی باقی است`
                : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
            </Link>
          )}
          {pastDue && (
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="mx-1 mb-1 block rounded-sm bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25 transition-colors"
            >
              {fa ? "پرداخت ناموفق — به‌روزرسانی" : "Payment failed — update billing"}
            </Link>
          )}

          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "حساب کاربری" : "Account"}
          </Link>
          <Link
            to="/library"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "کتابخانه من" : "My Library"}
          </Link>
          <Link
            to="/my-tickets"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "بلیط‌های من" : "My tickets"}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
            >
              {fa ? "پنل مدیریت" : "Admin dashboard"}
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="w-full text-start rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "خروج" : "Sign out"}
          </button>
        </div>
      )}

    </div>
  );
}
