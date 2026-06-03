import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";

export function SiteFooter() {
  const { locale } = useLocale();
  return (
    <footer className="border-t border-line px-6 py-20 md:px-12 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-12 md:flex-row md:items-start">
          <div className="max-w-xs">
            <div className="mb-6">
              <Logo size={32} />
            </div>
            <p className="text-sm leading-relaxed text-cream/40">
              {locale === "fa"
                ? "خانه‌ای برای سینمای معاصر ایران. حمایت از فیلم‌سازان مستقل، با روایت مستقیم."
                : "A home for contemporary Iranian cinema. Supporting independent artists through direct storytelling."}
            </p>
          </div>

          <div className="flex gap-16 md:gap-24">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                {locale === "fa" ? "گردش" : "Explore"}
              </span>
              <a href="/" className="text-sm transition-colors hover:text-amber">
                {locale === "fa" ? "خانه" : "Home"}
              </a>
              <a href="/browse" className="text-sm transition-colors hover:text-amber">
                {locale === "fa" ? "آثار" : "Browse"}
              </a>
              <a href="/about" className="text-sm transition-colors hover:text-amber">
                {locale === "fa" ? "درباره" : "About"}
              </a>
              <a href="/contact" className="text-sm transition-colors hover:text-amber">
                {locale === "fa" ? "تماس" : "Contact"}
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30">
                {locale === "fa" ? "قانونی" : "Legal"}
              </span>
              <span className="cursor-default text-sm text-cream/60">
                {locale === "fa" ? "شرایط" : "Terms"}
              </span>
              <span className="cursor-default text-sm text-cream/60">
                {locale === "fa" ? "حریم خصوصی" : "Privacy"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-cream/30 md:flex-row">
          <span>
            © {new Date().getFullYear()} IRAN ·{" "}
            {locale === "fa" ? "تمامی حقوق محفوظ است" : "All rights reserved"}
          </span>
          <span>{locale === "fa" ? "برای روح مستقل" : "Designed for the independent spirit"}</span>
        </div>
      </div>
    </footer>
  );
}
