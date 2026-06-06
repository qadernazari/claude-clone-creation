import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "@tanstack/react-router";
import { Check, ChevronDown, Globe2, X } from "lucide-react";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";
import { useSubscription } from "@/hooks/use-subscription";
import { AcceptTrialButton } from "./accept-trial-button";
import { TrialBanner } from "./trial-banner";

function RegionToggle({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { locale, region, setRegion } = useLocale();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const isIran = region === "iran";
  const fa = locale === "fa";
  const lg = size === "lg";

  const choose = (next: "global" | "iran") => {
    setRegion(next);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || html.scrollTop || 0;
    const previousHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
      scrollBehavior: html.style.scrollBehavior,
    };
    const previousBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    html.style.scrollBehavior = "auto";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previousHtml.overflow;
      html.style.overscrollBehavior = previousHtml.overscrollBehavior;
      body.style.overflow = previousBody.overflow;
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.left = previousBody.left;
      body.style.right = previousBody.right;
      body.style.width = previousBody.width;
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => {
        html.style.scrollBehavior = previousHtml.scrollBehavior;
      });
    };
  }, [open]);

  const activeLabel = isIran ? "ایران" : "Global";
  const options = [
    {
      key: "global" as const,
      title: "Global",
      subtitle: "English interface",
      dir: "ltr" as const,
    },
    {
      key: "iran" as const,
      title: "ایران",
      subtitle: "رابط فارسی",
      dir: "rtl" as const,
    },
  ];

  return (
    <>
      <div
        role="group"
        aria-label="Region"
        dir="ltr"
        className={`hidden shrink-0 items-center gap-0.5 rounded-full border border-cream/15 bg-cream/[6%] p-0.5 font-medium tracking-[0.14em] uppercase whitespace-nowrap md:inline-flex ${
          lg ? "text-[11px]" : "text-[10px]"
        }`}
      >
        <button
          type="button"
          onClick={() => choose("global")}
          aria-pressed={!isIran}
          className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
            lg ? "min-h-9 px-3.5 py-1.5" : "px-2.5 py-1"
          } ${!isIran ? "bg-cream text-ink" : "text-cream/75 hover:text-cream"}`}
        >
          Global
        </button>
        <button
          type="button"
          onClick={() => choose("iran")}
          aria-pressed={isIran}
          className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
            lg ? "min-h-9 px-3.5 py-1.5" : "px-2.5 py-1"
          } ${isIran ? "bg-cream text-ink" : "text-cream/75 hover:text-cream"}`}
        >
          <span lang="fa" className="font-fa tracking-normal text-[12px] leading-none">ایران</span>
        </button>
      </div>

      <button
        type="button"
        dir="ltr"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={fa ? "انتخاب منطقه" : "Select region"}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-amber/25 bg-amber/[6%] px-3 text-[12px] font-semibold text-amber-bright shadow-[0_10px_30px_-18px_rgba(240,215,140,0.55)] transition-colors active:bg-amber/[12%] md:hidden"
      >
        <Globe2 size={15} strokeWidth={1.7} className="text-amber" aria-hidden />
        <span className={isIran ? "font-fa text-[13px] leading-none" : "leading-none"} lang={isIran ? "fa" : "en"}>
          {activeLabel}
        </span>
        <ChevronDown size={14} strokeWidth={1.7} className="text-amber/70" aria-hidden />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-bg-0/80 animate-fade-in md:hidden"
            onClick={() => setOpen(false)}
            onTouchMove={(event) => event.preventDefault()}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir={fa ? "rtl" : "ltr"}
            className="fixed inset-x-0 bottom-0 z-[110] overflow-hidden rounded-t-3xl border-t border-cream/10 bg-bg-1 shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.75)] animate-slide-up-sheet md:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <div className="flex min-h-9 items-center justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-cream/20" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/12 bg-cream/[7%] text-cream/85 active:bg-cream/[12%]"
              aria-label={fa ? "بستن" : "Close"}
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="px-5 pb-2 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber/80">
                {fa ? "منطقه" : "Region"}
              </p>
              <h2 id={titleId} className="mt-2 text-[22px] font-display text-cream-bright">
                {fa ? "تجربه تماشای خود را انتخاب کنید" : "Choose your viewing region"}
              </h2>
              <p className="mt-2 max-w-[19rem] text-[13px] leading-6 text-cream/55">
                {fa
                  ? "زبان، جهت صفحه، قیمت و روش پرداخت بر اساس منطقه تنظیم می‌شود."
                  : "Language, layout direction, pricing, and payment method update together."}
              </p>
            </div>
            <div className="grid gap-3 px-4 pt-4">
              {options.map((option) => {
                const active = region === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    dir={option.dir}
                    onClick={() => choose(option.key)}
                    aria-pressed={active}
                    className={`flex min-h-[92px] w-full items-center gap-4 rounded-2xl border px-4 py-4 text-start transition-all duration-300 active:scale-[0.99] ${
                      active
                        ? "border-amber/45 bg-amber/[10%] text-cream-bright shadow-[0_18px_45px_-30px_rgba(240,215,140,0.8)]"
                        : "border-cream/10 bg-bg-0/45 text-cream/82 active:bg-cream/[5%]"
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${active ? "border-amber/35 bg-amber/[14%] text-amber-bright" : "border-cream/10 bg-cream/[5%] text-cream/50"}`}>
                      {active ? <Check size={18} strokeWidth={2} aria-hidden /> : <Globe2 size={18} strokeWidth={1.7} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span lang={option.key === "iran" ? "fa" : "en"} className={`block text-[17px] font-semibold ${option.key === "iran" ? "font-fa" : "font-display"}`}>
                        {option.title}
                      </span>
                      <span lang={option.key === "iran" ? "fa" : "en"} className={`mt-1 block text-[13px] ${option.key === "iran" ? "font-fa" : ""} text-cream/68`}>
                        {option.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export function SiteHeader({ current }: { current?: "home" | "browse" | "about" }) {
  const { locale } = useLocale();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const fa = locale === "fa";
  const [scrolled, setScrolled] = useState(false);

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkCls = (key: "home" | "browse" | "about") =>
    `relative py-1 transition-colors duration-300 ${
      current === key ? "text-cream" : "text-cream/55 hover:text-cream"
    } after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-amber after:transition-all after:duration-500 ${
      current === key ? "after:w-full" : "after:w-0 hover:after:w-full"
    }`;


  return (
    <>
      <header
        className={`fixed top-0 z-30 w-full transition-all duration-500 ${
          scrolled
            ? "border-b border-cream/[6%] bg-bg-0/85 backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-bg-0/60 to-transparent"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <div
          dir="ltr"
          className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-500 sm:px-6 md:px-10 ${
            scrolled ? "py-2.5 md:py-3" : "py-3.5 md:py-5"
          }`}
        >
          <div className="flex items-center gap-10">
            <Link
              to="/"
              onClick={handleHomeClick}
              className="inline-flex items-center transition-opacity hover:opacity-80"
              aria-label="IRAN — home"
            >
              <Logo size={28} />
            </Link>
            <nav className="hidden gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] md:flex">
              <Link to="/" onClick={handleHomeClick} className={linkCls("home")}>
                {fa ? "خانه" : "Home"}
              </Link>
              <Link to="/browse" className={linkCls("browse")}>
                {fa ? "آثار اختصاصی" : "Originals"}
              </Link>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/browse"
              aria-label={fa ? "جست‌وجو" : "Search"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cream/65 transition-colors hover:bg-cream/5 hover:text-cream"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <RegionToggle />
            <MembershipCta />
            <AuthMenu />
          </div>

        </div>
        <TrialBanner />
      </header>
    </>
  );
}


function MembershipCta() {
  const { locale } = useLocale();
  const { isMember, isLoading } = useSubscription();

  const label = locale === "fa" ? "پذیرش رایگان" : "Accept Free Trial";

  if (isLoading || isMember) {
    return <div className="hidden h-10 w-[132px] shrink-0 sm:block" aria-hidden />;
  }

  return (
    <div className="hidden w-[132px] shrink-0 sm:block">
      <AcceptTrialButton
        className="inline-flex items-center rounded-full bg-cream px-4 py-2 text-[12px] font-semibold text-ink transition-all duration-300 hover:bg-cream-bright hover:shadow-lg disabled:opacity-70"
        label={label}
      />
    </div>
  );
}
