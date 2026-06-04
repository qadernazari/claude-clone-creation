import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { loadCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, type PagesContent } from "@/lib/cms";
import { usePageOverlay } from "./page-overlay";

const COL_EXPLORE = ["about", "submit", "press", "careers"] as const;
const COL_HELP = ["help", "devices", "contact", "faq"] as const;
const COL_LEGAL = ["terms", "privacy", "cookies"] as const;

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

  const { data: pages } = useQuery({
    queryKey: ["site_content", CMS_KEYS.PAGES],
    queryFn: () => loadCmsKey<PagesContent>(CMS_KEYS.PAGES),
  });

  const labelFor = (slug: string, fallback: string) => {
    if (slug === "faq") return fa ? "پرسش‌های متداول" : "FAQ";
    const p = pages?.[slug];
    if (!p) return fallback;
    return fa ? p.nameFa || p.nameEn : p.nameEn || p.nameFa;
  };


  const linkBtn = (slug: string, fallback: string) => (
    <button
      key={slug}
      type="button"
      onClick={() => openPage(slug)}
      className="text-start text-sm text-cream/65 transition-colors hover:text-amber"
    >
      {labelFor(slug, fallback)}
    </button>
  );

  return (
    <footer className="border-t border-line px-6 py-20 md:px-12 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-12 md:flex-row md:items-start">
          <div className="max-w-xs">
            <div className="mb-6">
              <Logo size={32} />
            </div>
            <p className="text-sm leading-relaxed text-cream/40">
              {fa
                ? "خانه‌ای برای سینمای معاصر ایران. حمایت از فیلم‌سازان مستقل، با روایت مستقیم."
                : "A home for contemporary Iranian cinema. Supporting independent artists through direct storytelling."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 md:gap-20">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                {fa ? "گردش" : "Explore"}
              </span>
              <Link to="/" onClick={handleHomeClick} className="text-sm text-cream/65 transition-colors hover:text-amber">
                {fa ? "خانه" : "Home"}
              </Link>
              <Link to="/browse" className="text-sm text-cream/65 transition-colors hover:text-amber">
                {fa ? "آثار" : "Browse"}
              </Link>
              {COL_EXPLORE.map((s) => linkBtn(s, s))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                {fa ? "راهنما" : "Help"}
              </span>
              {COL_HELP.map((s) => linkBtn(s, s))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                {fa ? "قانونی" : "Legal"}
              </span>
              {COL_LEGAL.map((s) => linkBtn(s, s))}
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30 md:flex-row">
          <span>
            © {new Date().getFullYear()} IRAN ·{" "}
            {fa ? "تمامی حقوق محفوظ است" : "All rights reserved"}
          </span>
          <span>{fa ? "برای روح مستقل" : "Designed for the independent spirit"}</span>
        </div>
      </div>
    </footer>
  );
}
