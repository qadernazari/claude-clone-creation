import { useCallback, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homeFeaturedSlidesQueryOptions, type HomeFeaturedFilm } from "../lib/home.functions";
import { useCurrentUser } from "@/hooks/use-subscription";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

const AUTOPLAY_MS = 6500;

export function FeaturedFilm() {
  const { data: slides } = useSuspenseQuery(homeFeaturedSlidesQueryOptions);

  if (!slides || slides.length === 0) return <FeaturedFilmFallback />;
  if (slides.length === 1) return <HeroShell><Slide film={slides[0]} active eager /></HeroShell>;

  return <FeaturedSlider slides={slides} />;
}

function HeroShell({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-bg-0">
      <div className="mx-auto mt-16 w-full max-w-7xl px-5 py-10 sm:px-6 md:mt-20 md:px-12 md:py-16">
        <div className="relative">{children}{extra}</div>
      </div>
    </section>
  );
}

function FeaturedSlider({ slides }: { slides: HomeFeaturedFilm[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (next: number) => {
      const len = slides.length;
      setIndex(((next % len) + len) % len);
    },
    [slides.length],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(next, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, paused, next]);

  const startX = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setPaused(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    setPaused(false);
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-bg-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startX.current = null;
        setPaused(false);
      }}
      aria-roledescription="carousel"
    >
      <div className="mx-auto mt-16 w-full max-w-7xl px-5 py-10 sm:px-6 md:mt-20 md:px-12 md:py-16">
        <div className="relative min-h-[720px] sm:min-h-[780px] lg:min-h-[820px]">
          {slides.map((film, i) => (
            <Slide key={film.id} film={film} active={i === index} eager={i === 0} />
          ))}

          {/* Controls row anchored to the text column */}
          <SliderControls
            count={slides.length}
            index={index}
            onPrev={prev}
            onNext={next}
            onGo={go}
          />
        </div>
      </div>
    </section>
  );
}

function SliderControls({
  count,
  index,
  onPrev,
  onNext,
  onGo,
}: {
  count: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onGo: (i: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center lg:justify-start">
      <div className="pointer-events-auto flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 bg-bg-1/40 text-cream/70 backdrop-blur-sm transition-all hover:border-amber/40 hover:bg-amber/10 hover:text-amber-bright rtl:rotate-180"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 bg-bg-1/40 text-cream/70 backdrop-blur-sm transition-all hover:border-amber/40 hover:bg-amber/10 hover:text-amber-bright rtl:rotate-180"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index ? "w-10 bg-amber" : "w-4 bg-cream/20 hover:bg-cream/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const POS_CLASS: Record<string, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

function Slide({ film, active, eager }: { film: HomeFeaturedFilm; active: boolean; eager: boolean }) {
  const { locale, num, year, t } = useLocale();
  useEffect(() => {
    if (!eager) return;
    let cancelled = false;
    void import("@/lib/hero-perf").then((m) => {
      if (!cancelled) m.measureHeroLCP();
    });
    return () => {
      cancelled = true;
    };
  }, [eager]);
  // Mobile uses the portrait cover (2:3); desktop uses the landscape thumbnail (16:9).
  const portraitImage = film.cover_url || film.mobile_cover_url || film.thumbnail_url;
  const landscapeImage = film.thumbnail_url || film.cover_url;
  const landscapeSrcSet = [
    film.thumbnail_url_1280 ? `${film.thumbnail_url_1280} 1280w` : null,
    film.thumbnail_url ? `${film.thumbnail_url} 1920w` : null,
    film.thumbnail_url_2400 ? `${film.thumbnail_url_2400} 2400w` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const fallbackBg =
    film.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";
  const title = t({ en: film.title_en, fa: film.title_fa || film.title_en });
  const director =
    film.category === "walking-tour"
      ? ""
      : t({ en: film.director_en || "", fa: film.director_fa || film.director_en || "" });
  const synopsis = t({ en: film.synopsis_en || "", fa: film.synopsis_fa || film.synopsis_en || "" });

  const isContain = film.cover_fit === "contain";
  const posClass = POS_CLASS[film.cover_position || "center"] || "object-center";
  const fitClass = isContain ? "object-contain object-center" : `object-cover ${posClass}`;

  return (
    <div
      className={`flex flex-col gap-8 pb-16 transition-opacity duration-700 ease-out lg:gap-10 ${
        active
          ? "relative z-10 opacity-100"
          : "pointer-events-none absolute inset-0 z-0 opacity-0"
      }`}
      aria-hidden={!active}
    >
      {/* Framed image — 2:3 on mobile, 16:9 on desktop */}
      <div className="relative flex justify-center">
        <div className="group relative w-full max-w-[380px] lg:max-w-none">
          {/* Ambient amber glow */}
          <div
            className="pointer-events-none absolute -inset-10 rounded-full bg-amber/10 opacity-60 blur-[100px]"
            aria-hidden
          />

          {/* The frame */}
          <div
            className="relative z-10 rounded-[1.75rem] border border-cream/10 bg-cream/5 p-2.5 shadow-2xl backdrop-blur-sm transition-transform duration-500 group-hover:scale-[1.01] lg:rounded-[2rem] lg:p-3"
          >
            <div
              className="relative aspect-[2/3] overflow-hidden rounded-[1.25rem] md:aspect-video md:rounded-[1.4rem]"
              style={{ background: fallbackBg }}
            >
              {portraitImage ? (
                <img
                  src={portraitImage}
                  alt={title}
                  width={800}
                  height={1200}
                  className={`absolute inset-0 block h-full w-full md:hidden ${fitClass} ${active ? "cine-img-in" : ""}`}
                  loading={eager ? "eager" : "lazy"}
                  decoding={eager ? "sync" : "async"}
                  {...(eager ? { fetchPriority: "high" as const } : {})}
                  sizes="(max-width: 768px) 90vw, (max-width: 1023px) 380px, 1px"
                />
              ) : null}
              {landscapeImage ? (
                <img
                  src={landscapeImage}
                  srcSet={landscapeSrcSet || undefined}
                  alt={title}
                  width={1920}
                  height={1080}
                  className={`absolute inset-0 hidden h-full w-full md:block ${fitClass} ${active ? "cine-img-in" : ""}`}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1200px) 1200px, (min-width: 768px) 80vw, 1px"
                />
              ) : null}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
                }}
              />
            </div>
          </div>

          {/* Corner accents */}
          <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-tr-[1.25rem] border-r-2 border-t-2 border-amber/30 lg:-right-4 lg:-top-4 lg:h-16 lg:w-16 lg:rounded-tr-[1.5rem]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-3 -left-3 h-12 w-12 rounded-bl-[1.25rem] border-b-2 border-l-2 border-amber/30 lg:-bottom-4 lg:-left-4 lg:h-16 lg:w-16 lg:rounded-bl-[1.5rem]" aria-hidden />
        </div>
      </div>

      {/* Text column */}
      <div className="flex flex-col gap-5 lg:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded bg-amber px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-md shadow-amber/20">
            {locale === "fa" ? "اختصاصی" : "Original"}
          </span>
          <span className="h-px w-8 bg-cream/20" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/55">
            {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
          </span>
        </div>

        <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-cream-bright sm:text-4xl lg:text-5xl xl:text-6xl">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cream/60">
          {director && <span>{director}</span>}
          {director && film.year ? <span className="text-amber/60">·</span> : null}
          {film.year ? <span>{year(film.year)}</span> : null}
          {film.duration_min ? (
            <>
              <span className="text-amber/60">·</span>
              <span>
                {num(film.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
              </span>
            </>
          ) : null}
        </div>

        {synopsis ? (
          <p className="max-w-3xl text-[15px] leading-relaxed text-cream/70 line-clamp-3 md:text-base">
            {synopsis}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            to="/films/$slug"
            params={{ slug: film.slug }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber px-7 py-3.5 text-[13px] font-bold text-ink shadow-xl shadow-amber/20 transition-all duration-200 hover:bg-amber-bright hover:shadow-2xl hover:shadow-amber/30 active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{locale === "fa" ? "تماشای فیلم" : "Watch Now"}</span>
          </Link>
          <Link
            to="/films/$slug"
            params={{ slug: film.slug }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-cream/15 bg-cream/5 px-7 py-3.5 text-[13px] font-semibold text-cream-bright backdrop-blur-md transition-colors duration-200 hover:border-cream/25 hover:bg-cream/10"
          >
            {locale === "fa" ? "اطلاعات بیشتر" : "More info"}
          </Link>
          <WatchlistCta slug={film.slug} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function WatchlistCta({ slug, locale }: { slug: string; locale: "en" | "fa" }) {
  const ready = useDeferredMount();
  if (!ready) return null;
  return <WatchlistCtaReady slug={slug} locale={locale} />;
}

function WatchlistCtaReady({ slug, locale }: { slug: string; locale: "en" | "fa" }) {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <Link
      to="/films/$slug"
      params={{ slug }}
      className="hidden min-h-11 items-center gap-2 rounded-md border border-cream/15 bg-cream/5 px-6 py-3.5 text-[13px] font-medium text-cream-bright transition-colors duration-200 hover:border-amber/40 hover:bg-amber/10 hover:text-amber-bright md:inline-flex"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {locale === "fa" ? "افزودن به فهرست" : "Add to Watchlist"}
    </Link>
  );
}

function FeaturedFilmFallback() {
  return (
    <section className="relative isolate overflow-hidden bg-bg-0">
      <div className="mx-auto mt-16 w-full max-w-7xl px-5 py-10 sm:px-6 md:mt-20 md:px-12 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 flex flex-col gap-6 lg:order-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
              Original Iranian Cinema
            </span>
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-cream-bright sm:text-5xl lg:text-6xl">
              ir.show
            </h2>
            <p className="max-w-lg text-[15px] leading-relaxed text-cream/70">
              A premium streaming home for Iranian films, documentaries, and curated stories.
            </p>
          </div>
          <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-amber/10 opacity-60 blur-[100px]" />
              <div className="relative z-10 rounded-[2rem] border border-cream/10 bg-cream/5 p-3 shadow-2xl backdrop-blur-sm">
                <div
                  className="aspect-[2/3] rounded-[1.4rem] lg:aspect-video"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 70%, oklch(0.30 0.045 70 / 0.72), transparent 62%), linear-gradient(180deg, oklch(0.18 0 0), var(--bg-0))",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
