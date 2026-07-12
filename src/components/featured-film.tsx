import { useCallback, useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homeFeaturedSlidesQueryOptions, type HomeFeaturedFilm } from "../lib/home.functions";

const AUTOPLAY_MS = 6500;

export function FeaturedFilm() {
  const { data: slides } = useSuspenseQuery(homeFeaturedSlidesQueryOptions);

  if (!slides || slides.length === 0) return <FeaturedFilmFallback />;
  if (slides.length === 1) {
    return (
      <HeroShell>
        <SlideImageFrame film={slides[0]} active eager />
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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 px-1">
        {Array.from({ length: count }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active ? "true" : undefined}
              className="flex cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 rounded-full"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  active
                    ? "h-1.5 w-7 bg-amber shadow-[0_0_10px_rgba(201,168,76,0.55)]"
                    : "h-1.5 w-1.5 bg-cream/25 hover:bg-cream/50"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-cream/50 transition-all duration-200 hover:bg-cream/5 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-cream/50 transition-all duration-200 hover:bg-cream/5 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95 rtl:rotate-180"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
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
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const title = t({ en: film.title_en, fa: film.title_fa || film.title_en });

  const watchHref = { to: "/films/$slug" as const, params: { slug: film.slug } };
  const handleWatchKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
      e.preventDefault();
      navigate(watchHref);
    }
  };

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
        {/* Ambient depth orbs — desktop only */}
        <div
          className="pointer-events-none absolute -left-10 -top-10 hidden h-40 w-40 rounded-full bg-amber/5 blur-[80px] md:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 -right-10 hidden h-72 w-72 rounded-full bg-amber/10 blur-[110px] md:block"
          aria-hidden
        />

        {/* Frame */}
        <div className="relative z-10 overflow-hidden rounded-[1.25rem] border border-cream/10 bg-cream/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] md:rounded-[2rem]">
          <div
            ref={frameRef}
            className="relative aspect-[2/3] touch-pan-y overflow-hidden rounded-[1rem] bg-bg-0 md:aspect-video md:rounded-[1.75rem]"
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
              <Link
                {...watchHref}
                aria-label={locale === "fa" ? `مشاهده جزئیات ${title}` : `View details for ${title}`}
                className="absolute inset-0 z-0 block cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
                draggable={false}
                onKeyDown={handleWatchKeyDown}
              >
                <picture className="block h-full w-full">
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
                    className={`cine-img absolute inset-0 block h-full w-full transition-transform duration-1000 ease-out md:group-hover:scale-[1.03] ${fitClass}`}
                    loading={eager ? "eager" : "lazy"}
                    decoding={eager ? "sync" : "async"}
                    fetchPriority={eager ? "high" : undefined}
                    sizes="(max-width: 767px) 90vw, (min-width: 1200px) 1200px, 80vw"
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                  />
                </picture>
              </Link>
            ) : null}

            {/* Layered cinematic gradients */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 35%, rgba(5,5,5,0.85) 100%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{
                background:
                  "linear-gradient(270deg, rgba(5,5,5,0.55) 0%, transparent 45%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{
                background:
                  "radial-gradient(circle at 85% 90%, rgba(201,168,76,0.12) 0%, transparent 55%)",
              }}
              aria-hidden
            />

            {active ? (
              <>
                {/* Top-right badge (RTL start) */}
                <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
                  <div className="pointer-events-auto absolute right-6 top-6 z-30 flex items-center gap-2 lg:right-10 lg:top-10">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber shadow-[0_0_8px_rgba(201,168,76,0.7)]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber">
                      {locale === "fa" ? "اختصاصی" : "Original"}
                    </span>
                  </div>
                </div>


                {/* Bottom overlay: title + console */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 hidden md:block">
                  <div className="flex items-end justify-between gap-6 p-6 lg:p-10">
                    {/* Console (visual left / LTR flow) */}
                    <div className="pointer-events-auto order-1 flex items-center gap-3 rounded-2xl border border-cream/10 bg-cream/[0.04] p-2 shadow-2xl backdrop-blur-2xl transition-colors hover:bg-cream/[0.07]">
                      {controls ? (
                        <div className="flex items-center gap-2 border-e border-cream/10 pe-3 ps-2 rtl:border-e-0 rtl:border-s rtl:border-cream/10 rtl:pe-2 rtl:ps-3">
                          {controls}
                        </div>
                      ) : null}
                      <Link
                        {...watchHref}
                        onKeyDown={handleWatchKeyDown}
                        aria-label={locale === "fa" ? `تماشای ${title}` : `Watch ${title}`}
                        className="group/btn inline-flex shrink-0 items-center gap-3 rounded-xl bg-amber px-5 py-2.5 font-bold text-ink shadow-lg shadow-amber/20 transition-all duration-200 hover:bg-amber/90 hover:shadow-[0_0_28px_rgba(201,168,76,0.35)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber focus-visible:ring-offset-4 focus-visible:ring-offset-bg-0 active:scale-[0.97]"
                      >
                        <span className="text-sm leading-none">
                          {locale === "fa" ? "تماشا" : "Watch Now"}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink/10 transition-transform group-hover/btn:scale-110">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </Link>
                    </div>

                    {/* Title block (visual right / RTL start) */}
                    <div className="pointer-events-auto order-2 min-w-0 flex-1 text-right transition-transform duration-500 md:group-hover:-translate-y-1">
                      <h2 className="line-clamp-2 break-words pb-1 font-display text-2xl font-black leading-[1.35] text-cream-bright drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] lg:text-3xl xl:text-4xl">
                        {title}
                      </h2>
                    </div>

                  </div>
                </div>

                {/* Mobile centered Watch pill */}
                <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 -translate-x-1/2 md:hidden">
                  <Link
                    {...watchHref}
                    onKeyDown={handleWatchKeyDown}
                    aria-label={locale === "fa" ? `تماشای ${title}` : `Watch ${title}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-amber/30 bg-bg-0/50 px-5 py-2.5 text-[12px] font-bold text-cream-bright shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-amber/50 hover:bg-bg-0/65 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber focus-visible:ring-offset-4 focus-visible:ring-offset-bg-0 active:scale-[0.98]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>{locale === "fa" ? "تماشا" : "Watch Now"}</span>
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile-only stacked controls below frame */}
      {active && controls ? (
        <div className="mt-6 flex justify-center md:hidden">
          <div className="rounded-2xl border border-cream/10 bg-bg-0/50 px-3 py-2 shadow-2xl backdrop-blur-xl">
            {controls}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeaturedFilmFallback() {
  return (
    <section className="relative isolate overflow-hidden bg-bg-0">
      <div className="mx-auto mt-24 w-full max-w-7xl px-5 pb-12 sm:px-6 md:mt-32 md:px-12 md:pb-10">
        <div className="relative w-full">
          <div className="relative z-10 overflow-hidden rounded-[1.25rem] border border-cream/10 bg-cream/5 shadow-2xl md:rounded-[2rem]">
            <div
              className="aspect-[2/3] rounded-[1rem] md:aspect-video md:rounded-[1.75rem]"
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
