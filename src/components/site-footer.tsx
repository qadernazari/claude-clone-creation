import { Link, useLocation } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube } from "lucide-react";
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
      className="border-t border-line px-5 pt-14 pb-10 sm:px-6 md:px-8 lg:px-6 md:pt-16"
      style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto w-full max-w-[110rem]">
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
              {fa ? "فیلم‌ها" : "Browse"}
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

        <div className="mt-12 flex flex-col-reverse items-start gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-cream/70">
            © {new Date().getFullYear()} IRAN · {fa ? "تمامی حقوق محفوظ است" : "All rights reserved"}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/iran"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fa ? "ایران در اینستاگرام" : "IRAN on Instagram"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cream/40 transition-colors hover:text-cream"
            >
              <Instagram size={16} aria-hidden />
            </a>
            <a
              href="https://www.facebook.com/iran"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fa ? "ایران در فیسبوک" : "IRAN on Facebook"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cream/40 transition-colors hover:text-cream"
            >
              <Facebook size={16} aria-hidden />
            </a>
            <a
              href="https://www.youtube.com/@iran"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fa ? "ایران در یوتیوب" : "IRAN on YouTube"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cream/40 transition-colors hover:text-cream"
            >
              <Youtube size={16} aria-hidden />
            </a>
            <a
              href="https://www.tiktok.com/@iran"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fa ? "ایران در تیک‌تاک" : "IRAN on TikTok"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cream/40 transition-colors hover:text-cream"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
