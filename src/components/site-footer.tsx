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
            <span className="text-[11px] uppercase tracking-[0.28em] text-cream/60">
              {fa ? "خانه‌ی سینمای ایران" : "Home of Iranian cinema"}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px]">
            {pageBtn("about", fa ? "درباره" : "About")}
            <Link to="/browse" className="text-cream/50 transition-colors hover:text-cream">
              {fa ? "آثار" : "Browse"}
            </Link>
            {pageBtn("help", fa ? "راهنما" : "Help")}
            {pageBtn("contact", fa ? "تماس" : "Contact")}
            {pageBtn("privacy", fa ? "حریم خصوصی" : "Privacy")}
            {pageBtn("terms", fa ? "قوانین" : "Terms")}
          </nav>
        </div>

        <div className="mt-12 border-t border-line pt-8 text-[10px] font-medium uppercase tracking-[0.28em] text-cream/25">
          © {new Date().getFullYear()} IRAN · {fa ? "تمامی حقوق محفوظ است" : "All rights reserved"}
        </div>
      </div>
    </footer>
  );
}
