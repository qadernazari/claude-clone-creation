import { useRef, useState } from "react";
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
 * Prime-Video-style horizontal row where hovering a card expands it inline
 * to a wider details card, pushing neighbors sideways. On touch devices the
 * hover-expand is disabled and taps just navigate.
 */
export function HoverExpandRow({
  films,
  eyebrow,
  title,
}: {
  films: Film[];
  eyebrow?: string;
  title?: string;
}) {
  const { locale, num, year } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const rtl = locale === "fa";
  if (films.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const prevPath = rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6";
  const nextPath = rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";

  return (
    <section className="relative mx-auto max-w-[1400px] px-5 md:px-12">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div>
          {eyebrow ? (
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.28em] text-amber/90">
              {eyebrow}
            </span>
          ) : null}
          {title ? (
            <h2 className="font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[26px]">
              {title}
            </h2>
          ) : null}
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={rtl ? "قبلی" : "Previous"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={prevPath} /></svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={rtl ? "بعدی" : "Next"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={nextPath} /></svg>
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-5 py-4 md:-mx-12 md:snap-mandatory md:gap-4 md:px-12"
        style={{
          scrollPaddingLeft: "1.25rem",
          WebkitOverflowScrolling: "touch" as never,
          maskImage:
            "linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%)",
        }}
      >
        {films.map((f) => (
          <HoverCard key={f.id} film={f} locale={locale} num={num} year={year} />
        ))}
        <div className="w-2 shrink-0 md:w-4" aria-hidden />
      </div>
    </section>
  );
}

function HoverCard({
  film,
  locale,
  num,
  year,
}: {
  film: Film;
  locale: "en" | "fa";
  num: (n: number) => string;
  year: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<number | null>(null);
  const title = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
  const director = locale === "fa" ? film.director_fa || film.director_en : film.director_en;

  const onEnter = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setExpanded(true), 220);
  };
  const onLeave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setExpanded(false);
  };

  return (
    <div
      className="group relative shrink-0 snap-start"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        // Reserve space in the row: on desktop we grow inline to push neighbors.
        transition: "width 260ms cubic-bezier(0.2, 0.7, 0.2, 1)",
      }}
    >
      <Link
        to="/films/$slug"
        params={{ slug: film.slug }}
        preload="intent"
        className="block"
      >
        <div
          className={`relative aspect-[2/3] w-[42vw] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/8 transition-all duration-300 sm:w-[200px] md:w-[210px] lg:w-[220px] ${
            expanded
              ? "md:!w-[320px] md:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] md:ring-amber/40"
              : ""
          }`}
        >
          {film.cover_url ? (
            <img
              src={film.cover_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
              aria-hidden
            />
          )}
          {film.is_premium ? (
            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-bright backdrop-blur-sm">
              {locale === "fa" ? "پرمیوم" : "Premium"}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Title strip (always visible on mobile / when collapsed) */}
      <div className={`mt-3 px-0.5 transition-opacity duration-200 ${expanded ? "md:opacity-0" : "opacity-100"}`}>
        <h3 className="font-display text-[13px] font-medium leading-snug tracking-[-0.01em] text-cream-bright line-clamp-1 md:text-[14px]">
          {title}
        </h3>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cream/40 line-clamp-1 md:text-[11px]">
          {director}
          {film.year ? <> {" · "} {year(film.year)}</> : null}
        </p>
      </div>

      {/* Expanded details panel — desktop only */}
      <div
        aria-hidden={!expanded}
        className={`pointer-events-none absolute left-0 right-0 top-full z-20 hidden md:block ${
          expanded ? "md:pointer-events-auto" : ""
        }`}
        style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? "translateY(-8px)" : "translateY(-16px)",
          transition: "opacity 200ms ease-out, transform 220ms ease-out",
        }}
      >
        <div className="mx-1 mt-1 rounded-lg bg-bg-1/95 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md ring-1 ring-cream/10">
          <h3 className="font-display text-[15px] font-semibold leading-tight text-cream-bright line-clamp-2">
            {title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-cream/55">
            {film.year ? <span>{year(film.year)}</span> : null}
            {film.duration_min ? (
              <>
                {film.year ? <span className="text-amber/50">·</span> : null}
                <span>
                  {num(film.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                </span>
              </>
            ) : null}
            {film.is_premium ? (
              <>
                <span className="text-amber/50">·</span>
                <span className="text-amber/90">{locale === "fa" ? "پرمیوم" : "Premium"}</span>
              </>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/films/$slug"
              params={{ slug: film.slug }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-cream-bright px-3 text-[12px] font-semibold text-ink hover:bg-cream"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              {locale === "fa" ? "پخش" : "Play"}
            </Link>
            <Link
              to="/films/$slug"
              params={{ slug: film.slug }}
              aria-label={locale === "fa" ? "جزئیات" : "More info"}
              className="grid h-8 w-8 place-items-center rounded-full border border-cream/25 text-cream/80 hover:border-amber/50 hover:text-amber-bright"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="8.01" />
                <polyline points="11 12 12 12 12 16 13 16" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
