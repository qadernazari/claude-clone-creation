import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../../lib/i18n";
import type { HomeRailFilm } from "../../lib/home.functions";

type Film = HomeRailFilm;

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

/**
 * Prime/Netflix-style "Top 10" row — a giant outlined numeral sits behind
 * each poster, cut off at the bottom, in a heavy display font.
 */
export function TopTenRow({
  films,
  title,
  eyebrow,
}: {
  films: Film[];
  title?: string;
  eyebrow?: string;
}) {
  const { locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const rtl = locale === "fa";
  const items = films.slice(0, 10);
  if (items.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const prevPath = rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6";
  const nextPath = rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";

  return (
    <section className="relative mx-auto max-w-[1400px] px-5 md:px-12">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div>
          {eyebrow ? (
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.28em] text-amber/90">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="flex items-center gap-2 font-display text-[22px] font-medium tracking-[-0.02em] text-cream-bright md:text-[28px]">
            {title || (locale === "fa" ? "برترین‌های ایران" : "Top 10 in Iran")}
            <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-emerald-500/90 text-[10px] font-bold text-black md:h-7 md:w-7 md:text-[11px]">
              10
            </span>
          </h2>
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={rtl ? "قبلی" : "Previous"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={prevPath} /></svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={rtl ? "بعدی" : "Next"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={nextPath} /></svg>
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-5 pb-2 md:-mx-12 md:snap-mandatory md:gap-6 md:px-12"
        style={{
          scrollPaddingLeft: "1.25rem",
          WebkitOverflowScrolling: "touch" as never,
        }}
      >
        {items.map((film, i) => {
          const title = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
          const rank = i + 1;
          return (
            <Link
              key={film.id}
              to="/films/$slug"
              params={{ slug: film.slug }}
              preload="intent"
              className="group relative flex shrink-0 snap-start items-end gap-0 pl-[14vw] sm:pl-[80px] md:pl-[110px]"
              style={{ height: "auto" }}
            >
              {/* Giant outlined numeral */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 flex items-end font-display leading-none"
                style={{
                  fontSize: "clamp(120px, 18vw, 220px)",
                  fontWeight: 900,
                  color: "transparent",
                  WebkitTextStroke: "2px var(--cream, #f4ecd8)",
                  textShadow: "0 6px 30px rgba(0,0,0,0.6)",
                  transform: "translateY(6%)",
                  letterSpacing: "-0.05em",
                  opacity: 0.85,
                }}
              >
                {rank}
              </span>
              {/* Poster */}
              <div className="relative aspect-[2/3] w-[36vw] shrink-0 overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/8 transition-transform duration-300 md:w-[200px] md:group-hover:scale-[1.03] lg:w-[220px]">
                {film.cover_url ? (
                  <img
                    src={film.cover_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
                    aria-hidden
                  />
                )}
                {rank <= 3 && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-amber/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ink md:text-[9px]">
                    {locale === "fa" ? "جدید" : "New"}
                  </span>
                )}
              </div>
              {/* Screen-reader title */}
              <span className="sr-only">{title}</span>
            </Link>
          );
        })}
        <div className="w-2 shrink-0 md:w-4" aria-hidden />
      </div>
    </section>
  );
}
