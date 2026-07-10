import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { useAuthState } from "../lib/auth-context";
import { Logo } from "./logo";




function RegionGlobeIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.85 3.75 5.85 3.75 9S14.5 18.15 12 21c-2.5-2.85-3.75-5.85-3.75-9S9.5 5.85 12 3Z" />
    </svg>
  );
}

function RegionCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.2 4L19 7" />
    </svg>
  );
}

function RegionChevronIcon() {
  return (
    <svg className="region-trigger-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RegionCloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function RegionToggle({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { locale, region, setRegion } = useLocale();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const isIran = region === "iran";
  const fa = locale === "fa";
  const lg = size === "lg";

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef(0);
  const dragging = useRef(false);

  const choose = (next: "global" | "iran") => {
    setRegion(next);
    setOpen(false);
  };

  const onDragStart = (e: React.TouchEvent | React.PointerEvent) => {
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = y;
    dragCurrentY.current = 0;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  };

  const onDragMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (!dragging.current || dragStartY.current == null) return;
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dy = Math.max(0, y - dragStartY.current);
    dragCurrentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = dragCurrentY.current;
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
      if (dy > 90) {
        const h = el.getBoundingClientRect().height || 600;
        el.style.transform = `translateY(${h}px)`;
        window.setTimeout(() => setOpen(false), 200);
      } else {
        el.style.transform = "translateY(0)";
      }
    }
    dragStartY.current = null;
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
        className={`hidden shrink-0 items-center gap-1 rounded-md border border-cream/10 bg-black/40 p-1 font-semibold tracking-[0.12em] uppercase whitespace-nowrap md:inline-flex ${
          lg ? "text-[11px]" : "text-[10px]"
        }`}
      >
        <button
          type="button"
          onClick={() => choose("global")}
          aria-pressed={!isIran}
          className={`btn-seg-item transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
            lg ? "h-8 px-4" : "h-7 px-3"
          } ${!isIran ? "bg-cream text-ink shadow-sm" : "text-cream/55 hover:text-cream"}`}
        >
          Global
        </button>
        <button
          type="button"
          onClick={() => choose("iran")}
          aria-pressed={isIran}
          className={`btn-seg-item transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
            lg ? "h-8 px-4" : "h-7 px-3"
          } ${isIran ? "bg-cream text-ink shadow-sm" : "text-cream/55 hover:text-cream"}`}
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
        className="region-mobile-trigger inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-cream/25 bg-cream/8 px-3 text-[12px] font-semibold text-cream transition-colors hover:bg-cream/12 md:hidden"
        style={{
          WebkitAppearance: "none",
          appearance: "none",
          background: "rgba(var(--rgb-bg-0), 0.76)",
          borderColor: "rgba(var(--rgb-cream), 0.28)",
          color: "rgb(var(--rgb-cream))",
          boxShadow: "inset 0 1px 0 rgba(var(--rgb-cream), 0.08), 0 8px 22px -18px rgba(0, 0, 0, 0.85)",
        }}
      >
        <RegionGlobeIcon size={15} className="region-trigger-icon" />
        <span className={isIran ? "font-fa text-[13px] leading-none" : "leading-none"} lang={isIran ? "fa" : "en"}>
          {activeLabel}
        </span>
        <RegionChevronIcon />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="region-sheet-backdrop fixed inset-0 z-[100] animate-fade-in md:hidden"
            onClick={() => setOpen(false)}
            onTouchMove={(event) => event.preventDefault()}
            aria-hidden
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir={fa ? "rtl" : "ltr"}
            className="region-sheet fixed inset-x-0 bottom-0 z-[110] overflow-hidden rounded-t-3xl shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.75)] animate-slide-up-sheet md:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <div
              className="region-sheet-grab flex min-h-12 cursor-grab items-center justify-center pt-2 active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
              onTouchCancel={onDragEnd}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse") return;
                onDragStart(e);
              }}
              onPointerMove={(e) => {
                if (!dragging.current) return;
                onDragMove(e);
              }}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              role="button"
              aria-label={fa ? "برای بستن به پایین بکشید" : "Swipe down to close"}
            >
              <span className="region-sheet-handle h-1.5 w-11 rounded-full" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="region-sheet-close absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-md"
              aria-label={fa ? "بستن" : "Close"}
            >
              <RegionCloseIcon />
            </button>
            <div className="px-5 pb-2 pt-3">
              <p className="region-sheet-eyebrow text-[10px] font-semibold uppercase tracking-[0.24em]">
                {fa ? "منطقه" : "Region"}
              </p>
              <h2 id={titleId} className="mt-2 text-[22px] font-display text-cream-bright">
                {fa ? "تجربه تماشای خود را انتخاب کنید" : "Choose your viewing region"}
              </h2>
              <p className="region-sheet-copy mt-2 max-w-[19rem] text-[13px] leading-6">
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
                    className={`region-card flex min-h-[92px] w-full items-center gap-4 rounded-md px-4 py-4 text-start transition-all duration-300 active:scale-[0.99] ${
                      active ? "region-card-active" : ""
                    }`}
                  >
                    <span className={`region-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${active ? "region-card-icon-active" : ""}`}>
                      {active ? <RegionCheckIcon /> : <RegionGlobeIcon />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span lang={option.key === "iran" ? "fa" : "en"} className={`block text-[17px] font-semibold ${option.key === "iran" ? "font-fa" : "font-display"}`}>
                        {option.title}
                      </span>
                      <span lang={option.key === "iran" ? "fa" : "en"} className={`region-card-subtitle mt-1 block text-[13px] ${option.key === "iran" ? "font-fa" : ""}`}>
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
  const { user, isLoading: authLoading } = useAuthState();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isFilmPage = location.pathname.startsWith("/films/");
  const hasHero = isHome || isFilmPage;
  const fa = locale === "fa";
  const [scrolled, setScrolled] = useState(false);

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
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
        className={`site-header fixed top-0 z-30 w-full transition-all duration-500 ${
          hasHero && !scrolled
            ? "border-b border-transparent bg-transparent backdrop-blur-none"
            : "border-b border-cream/8 bg-bg-0/90 backdrop-blur-xl"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <div
          dir="ltr"
          className={`mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 md:px-10 transition-all duration-500 ${
            scrolled ? "md:py-3" : "md:py-5"
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
            <nav className="hidden gap-6 text-[11px] font-semibold uppercase tracking-[0.18em] lg:flex xl:gap-7">
              <Link to="/" onClick={handleHomeClick} className={linkCls("home")}>
                {fa ? "خانه" : "Home"}
              </Link>
              <Link to="/originals" className="relative py-1 text-cream/55 transition-colors duration-300 hover:text-cream after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-amber after:transition-all after:duration-500 hover:after:w-full">
                {fa ? "اختصاصی" : "Originals"}
              </Link>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/browse"
              aria-label={fa ? "جست‌وجو" : "Search"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cream/20 text-cream transition-all duration-200 hover:bg-cream/5 hover:border-cream/40 active:scale-95"
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
            {!authLoading && !user && (
              <Link
                to="/auth"
                className="hidden h-10 shrink-0 items-center whitespace-nowrap px-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-cream/70 transition-colors hover:text-cream-bright md:inline-flex"
              >
                {fa ? "ورود" : "Sign in"}
              </Link>
            )}
            <Link
              to="/membership"
              className="hidden h-10 shrink-0 items-center whitespace-nowrap rounded-md bg-amber px-5 text-[12px] font-bold uppercase leading-none tracking-[0.08em] text-ink shadow-sm transition-colors duration-200 hover:bg-amber/90 active:scale-95 sm:inline-flex"
            >
              {fa ? "عضویت" : "Membership"}
            </Link>
            {!authLoading && (
              user ? (
                <Link
                  to="/account"
                  aria-label={fa ? "حساب کاربری" : "Account"}
                  className="mobile-signin-trigger hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cream/20 bg-transparent text-cream transition-colors duration-200 hover:border-cream/40 hover:bg-cream/5 active:scale-95 md:inline-flex"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
                  </svg>
                </Link>
              ) : (
                <Link
                  to="/auth"
                  aria-label={fa ? "ورود" : "Sign in"}
                  className="mobile-signin-trigger inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cream/20 bg-transparent text-cream transition-colors duration-200 hover:border-cream/40 hover:bg-cream/5 active:scale-95 md:hidden"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
                  </svg>
                </Link>
              )
            )}
          </div>

        </div>
      </header>
    </>
  );
}


