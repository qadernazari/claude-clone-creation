import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";
import { useSubscription } from "@/hooks/use-subscription";
import { AcceptTrialButton } from "./accept-trial-button";
import { TrialBanner } from "./trial-banner";

function LanguageToggle({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { locale, setLocale } = useLocale();
  const isEn = locale === "en";
  const lg = size === "lg";
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-2 font-medium tracking-[0.18em] text-cream/45 ${
        lg ? "text-[13px]" : "text-[11px]"
      }`}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={isEn}
        className={`rounded-sm transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          lg ? "min-h-11 min-w-11 px-3 py-2" : "px-1 py-0.5"
        } ${isEn ? "text-amber" : "hover:text-cream/85"}`}
      >
        EN
      </button>
      <span aria-hidden="true" className="h-3 w-px bg-cream/15" />
      <button
        type="button"
        onClick={() => setLocale("fa")}
        aria-pressed={!isEn}
        lang="fa"
        className={`rounded-sm font-fa leading-none tracking-normal transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          lg ? "min-h-11 min-w-11 px-3 py-2 text-[15px]" : "px-1 py-0.5 text-[13px]"
        } ${!isEn ? "text-amber" : "hover:text-cream/85"}`}
      >
        فا
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
            ? "border-b border-cream/[0.06] bg-bg-0/85 backdrop-blur-xl"
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
