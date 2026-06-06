import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";
import { useSubscription } from "@/hooks/use-subscription";
import { AcceptTrialButton } from "./accept-trial-button";
import { TrialBanner } from "./trial-banner";

function RegionToggle({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { region, setRegion, setLocale } = useLocale();
  const isIran = region === "iran";
  const lg = size === "lg";

  const choose = (next: "global" | "iran") => {
    setRegion(next);
    setLocale(next === "iran" ? "fa" : "en");
  };

  return (
    <div
      role="group"
      aria-label="Region"
      className={`inline-flex items-center gap-1 rounded-full border border-cream/10 bg-cream/[3%] p-0.5 font-medium tracking-[0.16em] uppercase ${
        lg ? "text-[11px]" : "text-[10px]"
      }`}
    >
      <button
        type="button"
        onClick={() => choose("global")}
        aria-pressed={!isIran}
        className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          lg ? "min-h-9 px-3.5 py-1.5" : "px-2.5 py-1"
        } ${!isIran ? "bg-cream text-ink" : "text-cream/55 hover:text-cream"}`}
      >
        Global
      </button>
      <button
        type="button"
        onClick={() => choose("iran")}
        aria-pressed={isIran}
        className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          lg ? "min-h-9 px-3.5 py-1.5" : "px-2.5 py-1"
        } ${isIran ? "bg-cream text-ink" : "text-cream/55 hover:text-cream"}`}
      >
        <span lang="fa" className="font-fa tracking-normal">ایران</span>
      </button>
    </div>
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/browse"
              aria-label={fa ? "جست‌وجو" : "Search"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-cream/65 transition-colors hover:bg-cream/5 hover:text-cream"
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
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            {/* Compact language toggle on mobile (hamburger is gone — nav lives in the bottom tab bar) */}
            <div className="md:hidden">
              <LanguageToggle />
            </div>
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
