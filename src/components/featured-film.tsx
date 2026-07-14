import { useCallback, useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homeFeaturedSlidesQueryOptions, type HomeFeaturedFilm } from "../lib/home.functions";
import { useSubscription } from "../hooks/use-subscription";
import { watchCtaLabel, watchCtaShort } from "../lib/watch-cta";



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
      <div className="mx-auto w-full max-w-[110rem] px-0 pb-10 md:mt-32 md:px-8 lg:px-6 md:pb-10">


        {children}
      </div>
    </section>
  );
}

function FeaturedSlider({ slides }: { slides: HomeFeaturedFilm[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const go = useCallback(
    (next: number) => {
      const len = slides.length;
      setIndex(((next % len) + len) % len);
    },
    [slides.length],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Autoplay: 5s, pause on hover, off-screen, or prefers-reduced-motion.
  // Depending on `index` resets the timer after every slide change (manual or auto).
  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [paused, slides.length, index]);


  // Pause when off-screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setPaused((p) => (entry.isIntersecting ? p && false : true)),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const startX = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-bg-0"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto mt-0 w-full max-w-[110rem] px-0 pb-10 md:mt-32 md:px-8 lg:px-6 md:pb-10">

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
                },
              }}
              slider={{
                count: slides.length,
                index,
                onPrev: prev,
                onNext: next,
                onGo: go,
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
    <div className="flex items-center gap-2" dir="ltr">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-cream/50 transition-all duration-200 hover:bg-cream/5 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="flex items-center justify-center gap-1.5 px-2">
        {Array.from({ length: count }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active ? "true" : undefined}
              className="flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
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

      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-cream/50 transition-all duration-200 hover:bg-cream/5 hover:text-cream-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

const MD_POS_CLASS: Record<string, string> = {
  center: "md:object-center",
  top: "md:object-top",
  bottom: "md:object-bottom",
  left: "md:object-left",
  right: "md:object-right",
};


function SlideImageFrame({
  film,
  active,
  eager,
  controls,
  slider,
  swipeHandlers,
}: {
  film: HomeFeaturedFilm;
  active: boolean;
  eager: boolean;
  controls?: ReactNode;
  slider?: {
    count: number;
    index: number;
    onPrev: () => void;
    onNext: () => void;
    onGo: (i: number) => void;
  };
  swipeHandlers?: {
    onPointerDown: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onPointerCancel: (e: PointerEvent) => void;
  };
}) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { locale, t, year, num } = useLocale();
  const { user, isMember, isTrialExpired } = useSubscription();
  const ctaState = {
    isAuthenticated: !!user,
    isMember,
    isMembershipEnded: isTrialExpired,
  };
  const ctaLabel = watchCtaLabel(locale, ctaState);
  const ctaShort = watchCtaShort(locale, ctaState);
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
  const mdPosClass = MD_POS_CLASS[film.cover_position || "center"] || "md:object-center";
  // Mobile: always cover + centered so portrait crop of a 16:9 image stays balanced.
  // Desktop: honor admin-configured cover_fit / cover_position.
  const fitClass = isContain
    ? "object-cover object-center md:object-contain md:object-center"
    : `object-cover object-center md:object-cover ${mdPosClass}`;


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
        {/* Outer frame — split on desktop */}
        <div className="relative z-10 overflow-hidden md:h-[420px] md:rounded-[2rem] md:border md:border-cream/10 md:bg-cream/[0.03] md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.75)] lg:h-[480px] xl:h-[520px]">
          <div className="grid md:h-full md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]" dir="ltr">
            {/* IMAGE COLUMN */}
            <div
              ref={frameRef}
              className="relative aspect-[4/5] touch-pan-y overflow-hidden bg-bg-0 md:aspect-auto md:h-full"
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
                        sizes="(min-width: 1200px) 900px, 65vw"
                      />
                    ) : null}
                    <img
                      src={portraitImage || landscapeImage!}
                      alt={film.title_fa || film.title_en}
                      width={1920}
                      height={1080}
                      className={`cine-img absolute inset-0 block h-full w-full transition-transform duration-1000 ease-out md:group-hover:scale-[1.02] ${fitClass}`}
                      loading={eager ? "eager" : "lazy"}
                      decoding={eager ? "sync" : "async"}
                      fetchPriority={eager ? "high" : undefined}
                      sizes="(max-width: 767px) 90vw, (min-width: 1200px) 900px, 65vw"
                      draggable={false}
                      onLoad={() => setLoaded(true)}
                      onError={() => setLoaded(true)}
                    />
                  </picture>
                </Link>
              ) : null}

              {/* Mobile: top scrim so the transparent header stays legible over the photo */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 md:hidden"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.18) 30%, transparent 60%)",
                }}
                aria-hidden
              />

              {/* Desktop: right fade to blend image into info column */}
              <div
                className="pointer-events-none absolute inset-0 hidden md:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 65%, rgba(10,10,10,0.55) 100%)",
                }}
                aria-hidden
              />


              {/* Slider arrows — bottom-left of image, desktop only */}
              {active && controls ? (
                <div className="pointer-events-none absolute bottom-4 left-4 z-30 hidden md:block lg:bottom-6 lg:left-6">
                  <div className="pointer-events-auto rounded-2xl border border-cream/10 bg-bg-0/60 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
                    {controls}
                  </div>
                </div>
              ) : null}


            </div>

            {/* INFO COLUMN — desktop only */}
            {active ? (
              <div
                className="hidden h-full bg-linear-to-b from-bg-0/40 to-bg-0/80 md:flex md:flex-col md:px-8 md:pt-10 md:pb-8 lg:px-10 lg:pt-12 lg:pb-10"
                dir={locale === "fa" ? "rtl" : "ltr"}
              >
                <div className="flex h-full w-full flex-col">
                  {/* Kicker — compact, but not clipped */}
                  <div className="flex min-h-5 items-center gap-2 overflow-visible pb-0.5">
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber shadow-[0_0_8px_rgba(201,168,76,0.7)]" />
                    <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-amber">
                      {film.category === "walking-tour"
                        ? (locale === "fa" ? "پیاده‌روی گردشگری" : "Walking Tour")
                        : (locale === "fa" ? "اختصاصی" : "Original")}
                    </span>
                  </div>

                  {/* Title — allow full glyph height and wrapping without cutting Persian descenders */}
                  <div className="mt-4 flex min-h-[7.25rem] items-start overflow-visible pb-1 lg:min-h-[8.25rem] xl:min-h-[9.25rem]">
                    <h2 className="max-w-full text-balance font-display text-2xl font-black leading-[1.38] text-cream-bright drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] lg:text-3xl lg:leading-[1.35] xl:text-[2.2rem] xl:leading-[1.32]">
                      {title}
                    </h2>
                  </div>

                  {/* Meta — enough vertical room for Persian numerals and labels */}
                  <div className="mt-3 flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 overflow-visible pb-0.5 text-xs leading-6 text-cream/60 lg:text-[13px]">
                    {film.is_premium ? (
                      <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[11px] font-bold text-amber">
                        +{num(12)}
                      </span>
                    ) : null}
                    {film.year ? <span>{year(film.year)}</span> : null}
                    {film.duration_min ? (
                      <>
                        <span className="text-cream/25">•</span>
                        <span>{num(film.duration_min)}{locale === "fa" ? " دقیقه" : "m"}</span>
                      </>
                    ) : null}
                  </div>

                  {/* Synopsis — fills remaining space without cutting glyph bottoms */}
                  <div className="mt-4 min-h-0 flex-1 overflow-hidden pb-1">
                    {(film.synopsis_en || film.synopsis_fa) ? (
                      <p className="line-clamp-4 text-sm leading-[1.85] text-cream/70 lg:text-[15px] lg:leading-[1.8]">
                        {t({
                          en: film.synopsis_en ?? "",
                          fa: film.synopsis_fa ?? film.synopsis_en ?? "",
                        })}
                      </p>
                    ) : null}
                  </div>

                  {/* Watch button — pinned to panel bottom on every slide */}
                  <div className="mt-auto flex min-h-12 items-center pt-4">
                    <Link
                      {...watchHref}
                      onKeyDown={handleWatchKeyDown}
                      aria-label={locale === "fa" ? `تماشای ${title}` : `Watch ${title}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber px-6 py-2.5 text-sm font-bold text-ink transition hover:bg-amber-bright focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 active:scale-[0.98]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="leading-normal tracking-wide">{ctaLabel}</span>
                    </Link>
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>

        {/* Mobile CTA + dots — below the full-bleed hero image */}
        {active ? (
          <div className="pointer-events-auto z-40 mx-auto mt-5 w-full max-w-md px-5 md:hidden">
            <Link
              {...watchHref}
              onKeyDown={handleWatchKeyDown}
              aria-label={locale === "fa" ? `تماشای ${title}` : `Watch ${title}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-amber-bright focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{ctaLabel}</span>
            </Link>

            {slider ? (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {Array.from({ length: slider.count }).map((_, i) => {
                  const isActive = i === slider.index;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => slider.onGo(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={isActive ? "true" : undefined}
                      className="flex cursor-pointer items-center justify-center rounded-full"
                    >
                      <span
                        className={`block rounded-full transition-all duration-300 ${
                          isActive
                            ? "h-1.5 w-6 bg-amber shadow-[0_0_10px_rgba(201,168,76,0.55)]"
                            : "h-1.5 w-1.5 bg-cream/40"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>


    </div>
  );
}

function FeaturedFilmFallback() {
  return (
    <section className="relative isolate overflow-hidden bg-bg-0">
      <div className="mx-auto mt-0 w-full max-w-[110rem] px-0 pb-10 md:mt-32 md:px-8 lg:px-6 md:pb-10">
        <div className="relative w-full">
          <div className="relative z-10 overflow-hidden md:rounded-[2rem] md:border md:border-cream/10 md:bg-cream/5 md:shadow-2xl">
            <div
              className="aspect-[2/3] md:aspect-video md:rounded-[1.75rem]"
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
