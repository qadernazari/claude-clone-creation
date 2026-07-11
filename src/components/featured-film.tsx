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
  if (slides.length === 1) {
    return (
      <HeroShell>
        <Slide film={slides[0]} active eager />
      </HeroShell>
    );
  }

  return <FeaturedSlider slides={slides} />;
}

function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-bg-0">
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 pb-12 sm:px-6 md:mt-32 md:px-12 md:pb-10">
        {children}
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
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 pb-12 sm:px-6 md:mt-32 md:px-12 md:pb-10">
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
        <div className="mt-8 md:hidden">
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
    <div className="flex items-center gap-3 rounded-2xl border border-cream/10 bg-bg-0/50 px-3 py-2 shadow-2xl backdrop-blur-xl">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-cream/70 transition-all duration-200 hover:bg-cream/10 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
                active ? "h-6 w-6" : "h-5 w-5 hover:bg-cream/10"
              }`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  active
                    ? "h-2.5 w-2.5 bg-amber shadow-[0_0_0_4px_rgba(201,168,76,0.25)]"
                    : "h-1.5 w-1.5 bg-cream/30 hover:h-2 hover:w-2 hover:bg-cream/60"
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
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-cream/70 transition-all duration-200 hover:bg-cream/10 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
      className={`flex flex-col gap-5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:gap-6 ${
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
  const { locale, t } = useLocale();
  const title = t({ en: film.title_en, fa: film.title_fa || film.title_en });

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
      className={`transition-opacity duration-700 ease-out ${
        active
          ? "relative z-10 opacity-100"
          : "pointer-events-none absolute inset-0 z-0 opacity-0"
      }`}
      aria-hidden={!active}
    >
      <div className="group relative w-full">
        {/* Soft ambient amber glow — desktop only */}
        <div
          className="pointer-events-none absolute -inset-10 hidden rounded-full bg-amber/10 opacity-60 blur-[100px] md:block"
          aria-hidden
        />

        {/* Outer frame accents */}
        <div
          className="pointer-events-none absolute -right-3 -top-3 z-20 h-20 w-20 rounded-tr-[2rem] border-r-2 border-t-2 border-amber/30 lg:-right-4 lg:-top-4 lg:h-28 lg:w-28 lg:rounded-tr-[2.5rem]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-3 -left-3 z-20 h-20 w-20 rounded-bl-[2rem] border-b-2 border-l-2 border-amber/30 lg:-bottom-4 lg:-left-4 lg:h-28 lg:w-28 lg:rounded-bl-[2.5rem]"
          aria-hidden
        />

        {/* Frame */}
        <div className="relative z-10 overflow-hidden rounded-[1.75rem] border border-cream/10 bg-cream/5 shadow-2xl lg:rounded-[2.5rem]">
          <div
            ref={frameRef}
            className="relative aspect-[2/3] touch-pan-y overflow-hidden rounded-[1.25rem] md:aspect-[21/9] md:rounded-[2rem]"
            style={{ background: fallbackBg }}
          >
            {/* Shimmer skeleton */}
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
                  className={`cine-img absolute inset-0 block h-full w-full ${fitClass}`}
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

            {/* Cinematic overlays */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 40%, rgba(13,13,13,0.65) 100%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-bg-0/30 via-transparent to-transparent md:block"
              aria-hidden
            />

            {/* Inner subtle frame */}
            <div
              className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-cream/5 md:inset-4 md:rounded-[1.75rem]"
              aria-hidden
            />

            {active ? (
              <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
                {/* Top badges */}
                <div className="pointer-events-auto absolute right-6 top-6 z-30 flex flex-wrap items-center gap-3 lg:right-8 lg:top-8">
                  <span className="inline-flex items-center rounded-full bg-amber px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-md shadow-amber/20">
                    {locale === "fa" ? "اختصاصی" : "Original"}
                  </span>
                  <span className="h-px w-8 bg-cream/20" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/55">
                    {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
                  </span>
                </div>

                {/* Controls */}
                {controls ? (
                  <div className="pointer-events-auto absolute bottom-6 left-6 z-30 lg:bottom-8 lg:left-8">
                    {controls}
                  </div>
                ) : null}

                {/* Title + CTA */}
                <div className="pointer-events-auto absolute bottom-6 right-6 z-30 flex min-w-0 max-w-[20rem] flex-col items-end gap-4 text-right rtl:items-start sm:max-w-[26rem] lg:bottom-8 lg:right-8 lg:max-w-[36rem] lg:gap-6">
                  <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-cream-bright drop-shadow-2xl line-clamp-2 sm:text-4xl lg:text-5xl">
                    {title}
                  </h2>
                  <Link
                    to="/films/$slug"
                    params={{ slug: film.slug }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber px-6 py-3 text-[13px] font-bold text-ink shadow-xl shadow-amber/20 transition-all duration-200 hover:bg-amber-bright hover:shadow-2xl hover:shadow-amber/30 active:scale-[0.98]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>{locale === "fa" ? "تماشای فیلم" : "Watch Now"}</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {active && controls ? (
        <div className="mt-6 flex justify-center md:hidden">{controls}</div>
      ) : null}
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
    <div className="flex flex-col gap-5 md:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-amber px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-md shadow-amber/20">
          {locale === "fa" ? "اختصاصی" : "Original"}
        </span>
        <span className="h-px w-8 bg-cream/20" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/55">
          {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
        </span>
      </div>

      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-cream-bright sm:text-4xl">
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
        <p className="max-w-3xl text-[15px] leading-relaxed text-cream/70 line-clamp-3">
          {synopsis}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link
          to="/films/$slug"
          params={{ slug: film.slug }}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber px-7 py-3.5 text-[13px] font-bold text-ink shadow-xl shadow-amber/20 transition-all duration-200 hover:bg-amber-bright hover:shadow-2xl hover:shadow-amber/30 active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>{locale === "fa" ? "تماشای فیلم" : "Watch Now"}</span>
        </Link>
        <Link
          to="/films/$slug"
          params={{ slug: film.slug }}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cream/15 bg-cream/5 px-7 py-3.5 text-[13px] font-semibold text-cream-bright backdrop-blur-md transition-colors duration-200 hover:border-cream/25 hover:bg-cream/10"
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
      className="hidden min-h-11 items-center gap-2 rounded-2xl border border-cream/15 bg-cream/5 px-6 py-3.5 text-[13px] font-medium text-cream-bright transition-colors duration-200 hover:border-amber/40 hover:bg-amber/10 hover:text-amber-bright md:inline-flex"
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
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 pb-12 sm:px-6 md:mt-32 md:px-12 md:pb-10">
        <div className="relative w-full">
          <div className="pointer-events-none absolute -right-3 -top-3 z-20 h-20 w-20 rounded-tr-[2rem] border-r-2 border-t-2 border-amber/30 lg:-right-4 lg:-top-4 lg:h-28 lg:w-28 lg:rounded-tr-[2.5rem]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-3 -left-3 z-20 h-20 w-20 rounded-bl-[2rem] border-b-2 border-l-2 border-amber/30 lg:-bottom-4 lg:-left-4 lg:h-28 lg:w-28 lg:rounded-bl-[2.5rem]" aria-hidden />
          <div className="relative z-10 overflow-hidden rounded-[1.75rem] border border-cream/10 bg-cream/5 shadow-2xl lg:rounded-[2.5rem]">
            <div
              className="aspect-[2/3] rounded-[1.25rem] md:aspect-[21/9] md:rounded-[2rem]"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 70%, oklch(0.30 0.045 70 / 0.72), transparent 62%), linear-gradient(180deg, oklch(0.18 0 0), var(--bg-0))",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
