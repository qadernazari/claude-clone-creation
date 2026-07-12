import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { HomeRailFilm } from "../lib/home.functions";

type Film = HomeRailFilm;

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

/* ---------- Card ---------- */
function PosterCard({ film, locale, year }: { film: Film; locale: string; year: (n: number) => string }) {
  const ftitle = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
  const director = film.category === "walking-tour" ? "" : (locale === "fa" ? film.director_fa || film.director_en : film.director_en);
  const railImg = film.thumbnail_url || film.cover_url;
  const mobileImg = film.cover_url || film.thumbnail_url;
  const railSrcSet = [
    film.thumbnail_url_520 ? `${film.thumbnail_url_520} 520w` : null,
    film.thumbnail_url ? `${film.thumbnail_url} 760w` : null,
    film.thumbnail_url_1040 ? `${film.thumbnail_url_1040} 1040w` : null,
  ].filter(Boolean).join(", ");

  return (
    <Link
      to="/films/$slug"
      params={{ slug: film.slug }}
      preload="intent"
      className="group block w-[46vw] shrink-0 snap-start sm:w-[220px] md:w-[300px] lg:w-[340px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/8 transition-transform duration-300 md:group-hover:scale-[1.02] lg:aspect-video">
        {railImg || mobileImg ? (
          <picture>
            <source media="(min-width: 1024px)" srcSet={railSrcSet || railImg || undefined} sizes="(min-width: 1024px) 340px, 300px" />
            <img
              src={mobileImg || railImg || undefined}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="cine-img absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-3 px-0.5 md:mt-4">
        <h3 className="font-display text-[13px] font-medium leading-snug tracking-[-0.01em] text-cream-bright transition-colors line-clamp-1 md:text-[14px]">
          {ftitle}
        </h3>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cream/40 line-clamp-1 md:mt-1.5 md:text-[11px]">
          {director}
          {director && film.year ? <> {" · "} {year(film.year)}</> : !director && film.year ? year(film.year) : null}
        </p>
      </div>
    </Link>
  );
}

/* ---------- Rail ---------- */
export function Rail({
  eyebrow,
  title,
  subtitle,
  films,
  locale,
  year,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  films: Film[];
  locale: string;
  year: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rtl = locale === "fa";
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (films.length === 0) return null;

  const prevPath = rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6";
  const nextPath = rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  const prevLabel = rtl ? "قبلی" : "Previous";
  const nextLabel = rtl ? "بعدی" : "Next";

  const headline = title || eyebrow || "";
  const seeAllLabel = rtl ? "مشاهده همه" : "See all";

  return (
    <section
      className="relative mx-auto w-full max-w-[110rem] px-5 sm:px-6 md:px-8 lg:px-6 [content-visibility:auto] [contain-intrinsic-size:1px_520px]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span className="h-6 w-[3px] shrink-0 rounded-full bg-amber" aria-hidden />
          <h2 className="truncate font-display text-[18px] font-semibold tracking-[-0.01em] text-cream-bright md:text-[22px]">
            {headline}
          </h2>
          <Link
            to="/browse"
            className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-amber transition-opacity hover:opacity-75 sm:inline"
          >
            {seeAllLabel}
          </Link>
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={prevLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/60 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={prevPath} /></svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={nextLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/60 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={nextPath} /></svg>
          </button>
        </div>
      </div>
      {subtitle && (
        <p className="mb-4 -mt-2 text-[13px] text-cream/45">{subtitle}</p>
      )}
      <div
        ref={ref}
        className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-5 pt-2 pb-2 md:-mx-12 md:snap-mandatory md:gap-6 md:px-12 md:pt-3"
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
          <PosterCard key={f.id} film={f} locale={locale} year={year} />
        ))}
        <div className="w-2 shrink-0 md:w-4" aria-hidden />
      </div>
    </section>
  );
}

/* ---------- Skeleton mirroring Rail dimensions ---------- */
export function RailSkeleton({ title }: { title?: string }) {
  return (
    <section
      className="relative mx-auto max-w-[1400px] px-5 md:px-12"
      style={{ containIntrinsicSize: "1px 520px" }}
      aria-hidden
    >
      <div className="mb-5 flex items-center gap-3 md:gap-4">
        <span className="h-6 w-[3px] shrink-0 rounded-full bg-amber/40" />
        {title ? (
          <h2 className="truncate font-display text-[18px] font-semibold tracking-[-0.01em] text-cream-bright/70 md:text-[22px]">
            {title}
          </h2>
        ) : (
          <div className="h-5 w-40 rounded bg-cream/10 md:h-6 md:w-52" />
        )}
      </div>
      <div className="-mx-5 flex gap-3 overflow-hidden px-5 pt-2 pb-2 md:-mx-12 md:gap-6 md:px-12 md:pt-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-[46vw] shrink-0 sm:w-[220px] md:w-[300px] lg:w-[340px]"
          >
            <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-cream/6 lg:aspect-video" />
            <div className="mt-3 h-3.5 w-4/5 rounded bg-cream/8 md:mt-4" />
            <div className="mt-2 h-3 w-2/5 rounded bg-cream/6" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- LazyRail: mounts real Rail only when near viewport ---------- */
export function LazyRail(props: React.ComponentProps<typeof Rail>) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = holderRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "600px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={holderRef}>
      {visible ? <Rail {...props} /> : <RailSkeleton title={props.title} />}
    </div>
  );
}
