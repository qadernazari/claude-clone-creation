import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";

function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const isEn = locale === "en";
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-cream/45"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={isEn}
        className={`rounded-sm px-1 py-0.5 transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          isEn ? "text-amber" : "hover:text-cream/85"
        }`}
      >
        EN
      </button>
      <span aria-hidden="true" className="h-3 w-px bg-cream/15" />
      <button
        type="button"
        onClick={() => setLocale("fa")}
        aria-pressed={!isEn}
        lang="fa"
        className={`rounded-sm px-1 py-0.5 font-fa text-[13px] leading-none tracking-normal transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 ${
          !isEn ? "text-amber" : "hover:text-cream/85"
        }`}
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
    <header
      className={`fixed top-0 z-30 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-cream/[0.06] bg-bg-0/85 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-bg-0/60 to-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-500 md:px-10 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <div className="flex items-center gap-10">
          <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-80" aria-label="IRAN — home">
            <Logo size={32} />
          </Link>
          <nav className="hidden gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] md:flex">
            <Link to="/" className={linkCls("home")}>
              {locale === "fa" ? "خانه" : "Home"}
            </Link>
            <Link to="/browse" className={linkCls("browse")}>
              {locale === "fa" ? "آثار اختصاصی" : "Originals"}
            </Link>
            <Link to="/about" className={linkCls("about")}>
              {locale === "fa" ? "درباره" : "About"}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
