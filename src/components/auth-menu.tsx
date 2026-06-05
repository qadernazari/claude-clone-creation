import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  User as UserIcon,
  Library,
  Bookmark,
  PlayCircle,
  CreditCard,
  Ticket,
  Languages,
  Shield,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
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
  const { locale, setLocale } = useLocale();
  const fa = locale === "fa";
  const { user, isLoading: isUserLoading } = useCurrentUserState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sub, setSub] = useState<SubInfo>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the mobile sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
  const isMember =
    sub?.status === "active" || sub?.status === "trialing";

  const membership: {
    label: string;
    tone: "amber" | "green" | "red" | "neutral";
  } = pastDue
    ? { label: fa ? "پرداخت ناموفق" : "Payment failed", tone: "red" }
    : trialDaysLeft !== null
      ? {
          label: fa
            ? `دوره آزمایشی · ${trialDaysLeft} روز باقی‌مانده`
            : `Trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`,
          tone: "amber",
        }
      : isMember
        ? { label: fa ? "عضو فعال" : "Active member", tone: "green" }
        : { label: fa ? "بدون اشتراک" : "No active plan", tone: "neutral" };

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

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    (fa ? "حساب" : "Account");
  const initial = (user.user_metadata?.full_name || user.email || "?")[0]?.toUpperCase();

  const switchLanguage = () => {
    setLocale(fa ? "en" : "fa");
    setOpen(false);
  };

  return (
    <div className="relative flex w-[78px] justify-end" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-cream/20 to-cream/5 text-cream text-sm font-medium ring-1 ring-cream/10 transition-all hover:ring-cream/25 hover:from-cream/25"
        aria-label={fa ? "حساب کاربری" : "Account menu"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-full w-full items-center justify-center font-display tracking-wide">
          {initial}
        </span>
        {(trialDaysLeft !== null || pastDue) && (
          <span
            className={`absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg-0 ${pastDue ? "bg-red-500" : "bg-amber"}`}
            aria-hidden
          />
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          {/* Mobile scrim — fades the page behind the sheet */}
          <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm animate-fade-in md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel — bottom sheet on mobile, anchored dropdown on desktop */}
          <div
            role="dialog"
            aria-label={fa ? "حساب کاربری" : "Account"}
            className={[
              // Mobile sheet
              "fixed inset-x-0 bottom-0 z-[100] max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-cream/10 bg-bg-1 shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.7)] animate-slide-up-sheet",
              // Desktop dropdown — anchored to the avatar via a fixed wrapper isn't possible from portal, so on md+ we fall back to a top-right positioned panel
              "md:inset-x-auto md:end-4 md:top-20 md:bottom-auto md:w-[320px] md:max-h-[80dvh] md:rounded-2xl md:border md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] md:animate-fade-in",
            ].join(" ")}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
          >

            {/* Mobile grabber */}
            <div className="flex justify-center pt-3 md:hidden">
              <span className="h-1 w-10 rounded-full bg-cream/20" aria-hidden />
            </div>
            {/* Mobile close */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 bg-cream/5 text-cream/70 hover:text-cream-bright hover:bg-cream/10 md:hidden"
              aria-label={fa ? "بستن" : "Close"}
            >
              <X size={16} strokeWidth={1.8} />
            </button>

            {/* Profile header */}
            <header className="flex items-center gap-4 px-5 pt-7 pb-5 md:gap-3 md:px-5 md:pt-5 md:pb-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber/30 via-cream/15 to-cream/5 ring-1 ring-cream/15 md:h-12 md:w-12">
                <span className="flex h-full w-full items-center justify-center font-display text-xl text-cream-bright md:text-lg">
                  {initial}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[17px] text-cream-bright md:text-[15px]">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-cream/55">
                  {user.email}
                </p>
              </div>
            </header>

            {/* Membership badge */}
            <div className="px-5 pb-4 md:pb-3">
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className={[
                  "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                  membership.tone === "amber"
                    ? "border-amber/25 bg-amber/[7.000000000000001%] hover:bg-amber/[12%]"
                    : membership.tone === "green"
                      ? "border-emerald-400/20 bg-emerald-400/[6%] hover:bg-emerald-400/[10%]"
                      : membership.tone === "red"
                        ? "border-red-500/25 bg-red-500/[8%] hover:bg-red-500/[14.000000000000002%]"
                        : "border-cream/10 bg-cream/[3%] hover:bg-cream/[6%]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cream/45">
                    {fa ? "وضعیت اشتراک" : "Membership"}
                  </p>
                  <p
                    className={[
                      "mt-1 truncate text-[13px] font-medium",
                      membership.tone === "amber"
                        ? "text-amber-bright"
                        : membership.tone === "green"
                          ? "text-emerald-300"
                          : membership.tone === "red"
                            ? "text-red-300"
                            : "text-cream/80",
                    ].join(" ")}
                  >
                    {membership.label}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-cream/40 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>

            {/* Library section */}
            <Section title={fa ? "کتابخانه" : "Library"}>
              <Row
                to="/library"
                icon={<Library size={17} strokeWidth={1.6} />}
                label={fa ? "کتابخانه من" : "My Library"}
                onClick={() => setOpen(false)}
              />
              <Row
                to="/library"
                icon={<Bookmark size={17} strokeWidth={1.6} />}
                label={fa ? "فهرست تماشا" : "Watchlist"}
                onClick={() => setOpen(false)}
              />
              <Row
                to="/library"
                icon={<PlayCircle size={17} strokeWidth={1.6} />}
                label={fa ? "ادامه تماشا" : "Continue Watching"}
                onClick={() => setOpen(false)}
              />
            </Section>

            {/* Account section */}
            <Section title={fa ? "حساب" : "Account"}>
              <Row
                to="/account"
                icon={<UserIcon size={17} strokeWidth={1.6} />}
                label={fa ? "تنظیمات حساب" : "Account Settings"}
                onClick={() => setOpen(false)}
              />
              <Row
                to="/account"
                icon={<CreditCard size={17} strokeWidth={1.6} />}
                label={fa ? "اشتراک و صورتحساب" : "Subscription & Billing"}
                onClick={() => setOpen(false)}
              />
              <Row
                to="/my-tickets"
                icon={<Ticket size={17} strokeWidth={1.6} />}
                label={fa ? "بلیط‌های من" : "My Tickets"}
                onClick={() => setOpen(false)}
              />
              <button
                type="button"
                onClick={switchLanguage}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-[14px] text-cream/85 transition-colors hover:bg-cream/[5%] active:bg-cream/[8%]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cream/[6%] text-cream/70">
                  <Languages size={17} strokeWidth={1.6} />
                </span>
                <span className="flex-1">{fa ? "زبان" : "Language"}</span>
                <span className="text-[12px] uppercase tracking-widest text-cream/45">
                  {fa ? "EN" : "فا"}
                </span>
              </button>
            </Section>

            {/* Admin */}
            {isAdmin && (
              <Section title={fa ? "مدیریت" : "Administration"}>
                <Row
                  to="/admin"
                  icon={<Shield size={17} strokeWidth={1.6} />}
                  label={fa ? "پنل مدیریت" : "Admin Dashboard"}
                  onClick={() => setOpen(false)}
                  accent
                />
              </Section>
            )}

            {/* Sign out — same group/styling as other rows */}
            <Section title={fa ? "نشست" : "Session"}>
              <button
                type="button"
                onClick={signOut}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-[14px] text-cream/85 transition-colors hover:bg-cream/[5%] hover:text-cream-bright active:bg-cream/[8%]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cream/[6%] text-cream/70">
                  <LogOut size={17} strokeWidth={1.6} />
                </span>
                <span className="flex-1 truncate">{fa ? "خروج از حساب" : "Sign out"}</span>
                <ChevronRight
                  size={15}
                  className="text-cream/30 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </button>
            </Section>
            <div className="h-3" aria-hidden />
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-3 pb-2">
      <p className="px-3 pb-1.5 pt-2 text-[10px] uppercase tracking-[0.22em] text-cream/40">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Row({
  to,
  icon,
  label,
  onClick,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] transition-colors active:bg-cream/[8%]",
        accent
          ? "text-amber-bright hover:bg-amber/[8%]"
          : "text-cream/85 hover:bg-cream/[5%] hover:text-cream-bright",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-md",
          accent ? "bg-amber/[12%] text-amber" : "bg-cream/[6%] text-cream/70",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight
        size={15}
        className="text-cream/30 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
