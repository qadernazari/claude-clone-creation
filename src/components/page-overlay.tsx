import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, User, Ticket, CreditCard, LifeBuoy, Newspaper } from "lucide-react";
import { loadCmsKey } from "@/lib/cms-client";
import { CMS_KEYS, type PagesContent, type FaqContent, type PageCard } from "@/lib/cms";
import { useLocale } from "@/lib/i18n";

type Ctx = { openPage: (slug: string) => void; closePage: () => void };
const PageOverlayContext = createContext<Ctx | null>(null);

export function usePageOverlay() {
  const ctx = useContext(PageOverlayContext);
  if (!ctx) throw new Error("usePageOverlay must be used within PageOverlayProvider");
  return ctx;
}

function ICON({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "h-5 w-5";
  switch (name) {
    case "account": return <User className={cls} />;
    case "ticket": return <Ticket className={cls} />;
    case "billing": return <CreditCard className={cls} />;
    case "press": return <Newspaper className={cls} />;
    default: return <LifeBuoy className={cls} />;
  }
}

export function PageOverlayProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);

  const openPage = useCallback((s: string) => setSlug(s), []);
  const closePage = useCallback(() => setSlug(null), []);

  // Allow opening via URL hash (#page=about) for shareability
  useEffect(() => {
    const sync = () => {
      const m = /(?:^|&)page=([a-z0-9-]+)/.exec(window.location.hash.replace(/^#/, ""));
      if (m) setSlug(m[1]);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Lock body scroll while open — use position:fixed to fully prevent
  // background scroll on iOS Safari and preserve scroll position on close.
  useEffect(() => {
    if (!slug) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [slug]);

  const ctx = useMemo<Ctx>(() => ({ openPage, closePage }), [openPage, closePage]);

  return (
    <PageOverlayContext.Provider value={ctx}>
      {children}
      {slug && <PageSheet slug={slug} onClose={closePage} onNavigate={openPage} />}
    </PageOverlayContext.Provider>
  );
}

function PageSheet({ slug, onClose, onNavigate }: { slug: string; onClose: () => void; onNavigate: (s: string) => void }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const dir = fa ? "rtl" : "ltr";

  const { data: pages } = useQuery({
    queryKey: ["site_content", CMS_KEYS.PAGES],
    queryFn: () => loadCmsKey<PagesContent>(CMS_KEYS.PAGES),
  });
  const { data: faq } = useQuery({
    queryKey: ["site_content", CMS_KEYS.FAQ],
    queryFn: () => loadCmsKey<FaqContent>(CMS_KEYS.FAQ),
    enabled: slug === "faq",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Intercept clicks on internal data-page links inside the rendered body.
  function onBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("a[data-page]") as HTMLAnchorElement | null;
    if (target) {
      e.preventDefault();
      const next = target.getAttribute("data-page");
      if (next) onNavigate(next);
    }
  }

  const entry = pages?.[slug];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center"
      role="dialog"
      aria-modal="true"
      dir={dir}
    >
      {/* Solid backdrop — no fade so the home page never shows through during open */}
      <button
        type="button"
        aria-label={fa ? "بستن" : "Close"}
        onClick={onClose}
        className="absolute inset-0 bg-bg-0"
      />
      <div
        key={slug}
        className="relative my-0 md:my-10 w-full md:max-w-3xl bg-bg-0 md:rounded-2xl md:border border-line shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-150"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={fa ? "بستن" : "Close"}
          className="absolute top-4 end-4 z-10 h-9 w-9 inline-flex items-center justify-center rounded-md bg-bg-1/80 text-cream/70 hover:text-cream hover:bg-bg-1 transition-colors border border-line"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto" onClick={onBodyClick}>
          {!entry && slug !== "faq" && (
            <div className="p-16 text-center text-cream/50">
              {fa ? "صفحه پیدا نشد" : "Page not found"}
            </div>
          )}
          {(entry || slug === "faq") && (
            <article className={`px-6 py-14 md:px-12 md:py-20 ${fa ? "font-fa" : ""}`}>
              {entry?.[fa ? "fa" : "en"].kicker && (
                <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-amber">
                  {entry[fa ? "fa" : "en"].kicker}
                </p>
              )}
              {(entry || slug === "faq") && (
                <h1 className={`text-3xl md:text-5xl leading-tight text-cream-bright ${fa ? "font-fa" : "font-display"}`}>
                  {entry?.[fa ? "fa" : "en"].title ?? (slug === "faq" ? (fa ? faq?.headingFa ?? "پرسش‌های متداول" : faq?.headingEn ?? "Frequently asked") : "")}
                </h1>
              )}

              {entry?.[fa ? "fa" : "en"].cards && entry[fa ? "fa" : "en"].cards!.length > 0 && (
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {entry[fa ? "fa" : "en"].cards!.map((c: PageCard, i) => (
                    <div key={i} className="rounded-xl border border-line bg-bg-1/40 p-5">
                      <div className="mb-3 text-amber"><ICON name={c.icon} /></div>
                      <h3 className={`mb-2 text-sm font-semibold text-cream-bright ${fa ? "font-fa" : ""}`}>
                        {c.heading}
                      </h3>
                      <p className="text-xs leading-relaxed text-cream/60">
                        {c.address ?? c.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {entry?.[fa ? "fa" : "en"].body && (
                <div
                  className={`cms-prose mt-10 ${fa ? "font-fa" : ""}`}
                  dangerouslySetInnerHTML={{ __html: entry[fa ? "fa" : "en"].body }}
                />
              )}

              {slug === "faq" && faq && (
                <div className="mt-10 space-y-3">
                  {(fa ? faq.fa : faq.en).map(([q, a], i) => (
                    <details key={i} className="group rounded-lg border border-line bg-bg-1/30 px-4 py-3">
                      <summary className="cursor-pointer list-none flex justify-between items-center gap-4 text-cream font-medium">
                        <span>{q}</span>
                        <span className="text-amber transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-cream/70">{a}</p>
                    </details>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>

      </div>
    </div>
  );
}
