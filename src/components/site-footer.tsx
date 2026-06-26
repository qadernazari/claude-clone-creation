import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { usePageOverlay } from "./page-overlay";

export function SiteFooter() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const { openPage } = usePageOverlay();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const pageBtn = (slug: string, label: string) => (
    <button
      key={slug}
      type="button"
      onClick={() => openPage(slug)}
      className="text-cream/50 transition-colors hover:text-cream"
    >
      {label}
    </button>
  );

  return (
    <footer
      className="border-t border-line px-5 pt-14 pb-10 sm:px-6 md:px-12 md:pt-16"
      style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Link to="/" onClick={handleHomeClick} aria-label="IRAN — home">
              <Logo size={28} />
            </Link>
            <span className="text-[12px] tracking-wide text-cream/55">
              {fa ? "سینمای ایران، در سراسر جهان." : "IRANIAN CINEMA, STREAMED WORLDWIDE."}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px]">
            <Link to="/about" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "درباره" : "About"}
            </Link>
            <Link to="/browse" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "آثار" : "Browse"}
            </Link>
            <Link to="/help" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "راهنما" : "Help"}
            </Link>
            <Link to="/contact" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "تماس" : "Contact"}
            </Link>
            <Link to="/privacy" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "حریم خصوصی" : "Privacy"}
            </Link>
            <Link to="/terms" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "قوانین" : "Terms"}
            </Link>
          </nav>
        </div>

        <div className="mt-12 border-t border-line pt-8 text-[10px] font-medium uppercase tracking-[0.28em] text-cream/70">
          © {new Date().getFullYear()} IRAN · {fa ? "تمامی حقوق محفوظ است" : "All rights reserved"}
        </div>
      </div>
    </footer>
  );
}
