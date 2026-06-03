import { useEffect, useState } from "react";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";

function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className="relative inline-flex items-center overflow-hidden rounded-full border border-cream/10 bg-bg-1/40 p-0.5 text-[10px] uppercase tracking-widest backdrop-blur"
      role="group"
      aria-label="Language"
    >
      {/* Sliding active indicator — pinned to the logical start, which is
          always where the active button sits (EN in LTR, FA in RTL). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 start-0.5 w-[calc(50%-4px)] rounded-full bg-amber shadow-sm transition-opacity duration-500"
      />

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`relative z-10 rounded-full px-2.5 py-1 font-semibold transition-colors duration-300 ${
          locale === "en" ? "text-ink" : "text-cream/50 hover:text-cream"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fa")}
        className={`relative z-10 rounded-full px-2.5 py-1 font-semibold transition-colors duration-300 ${
          locale === "fa" ? "text-ink" : "text-cream/50 hover:text-cream"
        }`}
        aria-pressed={locale === "fa"}
        lang="fa"
      >
        فا
      </button>
    </div>
  );
}

export function SiteHeader({ current }: { current?: "home" | "browse" | "about" }) {
  const { locale } = useLocale();
  const [scrolled, setScrolled] = useState(false);

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
          <a href="/" className="inline-flex items-center transition-opacity hover:opacity-80" aria-label="IRAN — home">
            <Logo size={32} />
          </a>
          <nav className="hidden gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] md:flex">
            <a href="/" className={linkCls("home")}>
              {locale === "fa" ? "خانه" : "Home"}
            </a>
            <a href="/browse" className={linkCls("browse")}>
              {locale === "fa" ? "آثار اختصاصی" : "Originals"}
            </a>
            <a href="/about" className={linkCls("about")}>
              {locale === "fa" ? "درباره" : "About"}
            </a>
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
