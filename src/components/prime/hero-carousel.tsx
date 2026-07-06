import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../../lib/i18n";
import {
  homeFeaturedQueryOptions,
  homeRailsQueryOptions,
  type HomeFeaturedFilm,
  type HomeRailFilm,
} from "../../lib/home.functions";

type Slide = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  year: number | null;
  duration_min: number | null;
  is_premium: boolean | null;
  image: string | null;
  imageMobile: string | null;
  poster_gradient: string | null;
};

const AUTOPLAY_MS = 7000;

/**
 * Prime-Video-style rotating hero. Slide 0 is the SSR-critical featured
 * film (preserves the existing LCP path). Additional slides come from
 * the rails query, which loads client-side; auto-rotation only turns on
 * once we have >1 slide.
 */
export function HeroCarousel() {
  const { locale, num, year } = useLocale();
  const { data: featured } = useSuspenseQuery(homeFeaturedQueryOptions);
  // Rails query is deferred elsewhere; we opt in here without suspending.
  const { data: rails } = useQuery({ ...homeRailsQueryOptions, enabled: true });

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    if (featured) out.push(toSlideFromFeatured(featured, locale));
    const seen = new Set(out.map((s) => s.id));
    for (const f of rails?.films ?? []) {
      if (seen.has(f.id)) continue;
      // Only add rail films that actually have hero-worthy landscape art.
      if (!f.thumbnail_url) continue;
      out.push(toSlideFromRail(f, locale));
      if (out.length >= 5) break;
    }
    return out;
  }, [featured, rails, locale, t]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const canRotate = slides.length > 1;
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }, []);

  useEffect(() => {
    if (!canRotate || paused || prefersReducedMotion.current) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [canRotate, paused, slides.length]);

  // Clamp index if slides length shrinks.
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (slides.length === 0) return null;
  const rtl = locale === "fa";

  return (
    <section
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[85svh] min-h-[580px] w-full overflow-hidden bg-bg-1 md:h-[100dvh] md:min-h-[640px]">
        {/* Slide stack — cross-fade */}
        {slides.map((s, i) => (
          <SlideLayer
            key={s.id}
            slide={s}
            active={i === index}
            eager={i === 0}
            locale={locale}
            num={num}
            year={year}
            t={t}
            rtl={rtl}
          />
        ))}

        {/* Prev/Next chevrons — desktop only, on hover */}
        {canRotate && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              aria-label={rtl ? "بعدی" : "Previous"}
              className="group/nav absolute inset-y-0 left-0 z-20 hidden w-16 items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100 md:flex"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-cream backdrop-blur-sm transition-colors group-hover/nav:bg-black/70">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label={rtl ? "قبلی" : "Next"}
              className="group/nav absolute inset-y-0 right-0 z-20 hidden w-16 items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100 md:flex"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-cream backdrop-blur-sm transition-colors group-hover/nav:bg-black/70">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
                </svg>
              </span>
            </button>
          </>
        )}

        {/* Pagination dots */}
        {canRotate && (
          <div
            className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
            role="tablist"
            aria-label={rtl ? "اسلایدها" : "Slides"}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${rtl ? "اسلاید" : "Slide"} ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-cream-bright"
                    : "w-1.5 bg-cream/40 hover:bg-cream/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SlideLayer({
  slide,
  active,
  eager,
  locale,
  num,
  year,
  t: _t,
  rtl,
}: {
  slide: Slide;
  active: boolean;
  eager: boolean;
  locale: "en" | "fa";
  num: (n: number) => string;
  year: (n: number) => string;
  t: <T>(o: { en: T; fa: T } | null | undefined, fallback?: T) => T | undefined;
  rtl: boolean;
}) {
  const fallbackBg =
    slide.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: fallbackBg }}
      aria-hidden={!active}
    >
      {/* Mobile image */}
      {slide.imageMobile ? (
        <img
          src={slide.imageMobile}
          alt=""
          width={720}
          height={1280}
          className="absolute inset-0 block h-full w-full object-cover object-top md:hidden"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes="100vw"
          aria-hidden
        />
      ) : null}
      {/* Desktop image */}
      {slide.image ? (
        <img
          src={slide.image}
          alt=""
          width={1600}
          height={900}
          className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          aria-hidden
        />
      ) : null}

      {/* Vertical fade to bg-0 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.10) 30%, rgba(13,13,13,0.55) 70%, var(--bg-0) 100%)",
        }}
      />
      {/* Directional fade — Prime style: dark on the text side */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: rtl
            ? "linear-gradient(270deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.55) 35%, rgba(13,13,13,0.15) 60%, transparent 80%)"
            : "linear-gradient(90deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.55) 35%, rgba(13,13,13,0.15) 60%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex h-full items-end">
        <div className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-6 md:px-12 md:pb-24">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber md:mb-5">
              {locale === "fa" ? "اثر برگزیده" : "Featured"}
            </span>
            <h1 className="font-display text-[2.5rem] font-medium leading-[0.98] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {slide.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium uppercase tracking-[0.24em] text-cream/60 md:mt-5 md:text-[11px]">
              {slide.year ? <span>{year(slide.year)}</span> : null}
              {slide.year && slide.duration_min ? <span className="text-amber/60">·</span> : null}
              {slide.duration_min ? (
                <span>
                  {num(slide.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                </span>
              ) : null}
            </p>
            {slide.synopsis ? (
              <p className="mt-5 hidden max-w-xl text-[14px] leading-relaxed text-cream/75 line-clamp-3 sm:block md:mt-7 md:text-base">
                {slide.synopsis}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap items-center gap-2.5 md:mt-9 md:gap-3">
              <Link
                to="/films/$slug"
                params={{ slug: slide.slug }}
                tabIndex={active ? 0 : -1}
                className="inline-flex min-h-11 items-center gap-2.5 rounded-md bg-cream-bright px-7 py-3 text-[13px] font-semibold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] md:px-8 md:py-3.5 md:text-sm"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{locale === "fa" ? "تماشا کنید" : "Watch now"}</span>
              </Link>
              <Link
                to="/films/$slug"
                params={{ slug: slide.slug }}
                tabIndex={active ? 0 : -1}
                aria-label={locale === "fa" ? "جزئیات بیشتر" : "More info"}
                className="grid h-11 w-11 place-items-center rounded-full border border-cream/25 bg-black/40 text-cream backdrop-blur-md transition-colors hover:border-amber/50 hover:text-amber-bright"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="8.01" />
                  <polyline points="11 12 12 12 12 16 13 16" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickLang<T extends string | null>(locale: "en" | "fa", en: T, fa: T): string {
  const primary = locale === "fa" ? fa : en;
  const fallback = locale === "fa" ? en : fa;
  return (primary || fallback || "") as string;
}

function toSlideFromFeatured(f: HomeFeaturedFilm, locale: "en" | "fa"): Slide {
  return {
    id: f.id,
    slug: f.slug,
    title: pickLang(locale, f.title_en, f.title_fa),
    synopsis: pickLang(locale, f.synopsis_en, f.synopsis_fa),
    year: f.year,
    duration_min: f.duration_min,
    is_premium: f.is_premium,
    image: f.thumbnail_url || f.cover_url,
    imageMobile:
      f.mobile_cover_url || f.cover_url || f.thumbnail_url_mobile || f.thumbnail_url,
    poster_gradient: f.poster_gradient,
  };
}

function toSlideFromRail(f: HomeRailFilm, locale: "en" | "fa"): Slide {
  return {
    id: f.id,
    slug: f.slug,
    title: pickLang(locale, f.title_en, f.title_fa),
    synopsis: "",
    year: f.year,
    duration_min: f.duration_min,
    is_premium: f.is_premium,
    image: f.thumbnail_url || f.cover_url,
    imageMobile: f.cover_url || f.thumbnail_url,
    poster_gradient: f.poster_gradient,
  };
}
