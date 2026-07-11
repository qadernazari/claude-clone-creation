import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 sm:px-6 md:mt-32 md:px-12">
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
  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
    setPaused(true);
  };
  const onPointerUp = (e: PointerEvent) => {
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
      aria-roledescription="carousel"
    >
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 pb-6 sm:px-6 md:mt-32 md:px-12 md:pb-10">
        <div className="relative">
          {slides.map((film, i) => (
            <SlideImageFrame
              key={film.id}
              film={film}
              active={i === index}
              eager={i === 0}
              swipeHandlers={{
                onPointerDown,
                onPointerUp,
                onPointerCancel: () => {
                  startX.current = null;
                  setPaused(false);
                },
              }}
              controls={
                <SliderControls
                  count={slides.length}
                  index={index}
                  onPrev={prev}
                  onNext={next}
                  onGo={go}
                />
              }
            />
          ))}
        </div>
        <div className="mt-5 md:mt-6">
          <SlideDetails film={slides[index]} />
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
    <div className="flex items-center justify-center gap-2 rounded-full border border-cream/10 bg-black/50 px-3.5 py-2 shadow-xl backdrop-blur-md md:px-4 md:py-2.5">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-cream/15 bg-cream/5 text-cream/80 transition-all duration-200 hover:border-amber/60 hover:bg-amber/15 hover:text-amber-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="flex items-center gap-2 px-1">
        {Array.from({ length: count }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active ? "true" : undefined}
              className={`flex cursor-pointer items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-90 ${
                active
                  ? "h-7 w-7 border border-amber/60 bg-amber/15 text-amber shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:bg-amber/25"
                  : "h-7 w-7 hover:bg-cream/10"
              }`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  active
                    ? "h-2 w-2 bg-amber shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                    : "h-1.5 w-1.5 bg-cream/40 hover:h-2 hover:w-2 hover:bg-cream/70"
                }`}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-cream/15 bg-cream/5 text-cream/80 transition-all duration-200 hover:border-amber/60 hover:bg-amber/15 hover:text-amber-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
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
  return (
    <div
      className={`flex flex-col gap-5 pb-5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:gap-6 ${
        active
          ? "relative z-10 opacity-100"
          : "pointer-events-none absolute inset-0 z-0 opacity-0"
      }`}
      style={{ transform: active ? "translateX(0) scale(1)" : "translateX(-2%) scale(0.98)" }}
      aria-hidden={!active}
    >
      <SlideImageFrame film={film} active={active} eager={eager} />
      <SlideDetails film={film} />
    </div>
  );
}

function SlideImageFrame({
  film,
  active,
  eager,
  controls,
  swipeHandlers,
}: {
  film: HomeFeaturedFilm;
  active: boolean;
  eager: boolean;
  controls?: ReactNode;
  swipeHandlers?: {
    onPointerDown: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onPointerCancel: (e: PointerEvent) => void;
  };
}) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!frameRef.current || !swipeHandlers || !active) return;
    const el = frameRef.current;
    const onPointerDown = (e: PointerEvent) => swipeHandlers.onPointerDown(e);
    const onPointerUp = (e: PointerEvent) => swipeHandlers.onPointerUp(e);
    const onPointerCancel = (e: PointerEvent) => swipeHandlers.onPointerCancel(e);
    const onPointerLeave = (e: PointerEvent) => swipeHandlers.onPointerCancel(e);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("pointerleave", onPointerLeave);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [active, swipeHandlers]);

  const portraitImage = film.mobile_cover_url || film.cover_url || film.thumbnail_url;
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

  const isContain = film.cover_fit === "contain";
  const posClass = POS_CLASS[film.cover_position || "center"] || "object-center";
  const fitClass = isContain ? "object-contain object-center" : `object-cover ${posClass}`;

  return (
    <div
      className={`flex justify-center transition-opacity duration-700 ease-out ${
        active
          ? "relative z-10 opacity-100"
          : "pointer-events-none absolute inset-0 z-0 opacity-0"
      }`}
      aria-hidden={!active}
    >
      <div className="group relative w-full max-w-[380px] lg:max-w-none">
        {/* Ambient amber glow — desktop only; blur(100px) is a mobile perf killer */}
        <div
          className="pointer-events-none absolute -inset-10 hidden rounded-full bg-amber/10 opacity-60 blur-[100px] md:block"
          aria-hidden
        />

        {/* The frame — drop backdrop-blur on mobile to avoid compositor stalls */}
        <div className="relative z-10 rounded-[1.75rem] border border-cream/10 bg-cream/5 p-2.5 shadow-2xl transition-transform duration-500 group-hover:scale-[1.01] md:backdrop-blur-sm lg:rounded-[2rem] lg:p-3">
          <div
            ref={frameRef}
            className="relative aspect-[2/3] touch-pan-y overflow-hidden rounded-[1.25rem] md:aspect-video md:rounded-[1.4rem]"
            style={{ background: fallbackBg }}
          >
            {/* Shimmer skeleton — visible until the image loads */}
            <div
              className={`hero-shimmer pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                loaded ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden
            />
            {(portraitImage || landscapeImage) && (eager || active) ? (
              <picture>
                {landscapeImage ? (
                  <source
                    media="(min-width: 768px)"
                    srcSet={landscapeSrcSet || landscapeImage}
                    sizes="(min-width: 1200px) 1200px, 80vw"
                  />
                ) : null}
                <img
                  src={portraitImage || landscapeImage!}
                  alt={film.title_fa || film.title_en}
                  width={1920}
                  height={1080}
                  className={`absolute inset-0 block h-full w-full ${fitClass} ${active ? "cine-img-in" : ""}`}
                  loading={eager ? "eager" : "lazy"}
                  decoding={eager ? "sync" : "async"}
                  fetchPriority={eager ? "high" : undefined}
                  sizes="(max-width: 767px) 90vw, (min-width: 1200px) 1200px, 80vw"
                  draggable={false}
                  onLoad={() => setLoaded(true)}
                  onError={() => setLoaded(true)}
                />
              </picture>
            ) : null}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
              }}
            />
            {active && controls ? (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent md:h-32"
                  aria-hidden
                />
                <div className="absolute bottom-5 left-0 right-0 z-30 flex justify-center md:bottom-6">
                  {controls}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Corner accents */}
        <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-tr-[1.25rem] border-r-2 border-t-2 border-amber/30 lg:-right-4 lg:-top-4 lg:h-16 lg:w-16 lg:rounded-tr-[1.5rem]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-3 -left-3 h-12 w-12 rounded-bl-[1.25rem] border-b-2 border-l-2 border-amber/30 lg:-bottom-4 lg:-left-4 lg:h-16 lg:w-16 lg:rounded-bl-[1.5rem]" aria-hidden />
      </div>
    </div>
  );
}

function SlideDetails({ film }: { film: HomeFeaturedFilm }) {
  const { locale, num, year, t } = useLocale();
  const title = t({ en: film.title_en, fa: film.title_fa || film.title_en });
  const director =
    film.category === "walking-tour"
      ? ""
      : t({ en: film.director_en || "", fa: film.director_fa || film.director_en || "" });
  const synopsis = t({ en: film.synopsis_en || "", fa: film.synopsis_fa || film.synopsis_en || "" });

  return (
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
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 sm:px-6 md:mt-32 md:px-12">
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
