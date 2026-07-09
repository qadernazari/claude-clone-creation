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
  if (slides.length === 1) return <SingleSlide film={slides[0]} />;

  return <FeaturedSlider slides={slides} />;
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

  // Autoplay
  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(next, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, paused, next]);

  // Swipe / drag support (pointer events)
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
      className="group/hero relative isolate overflow-hidden"
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
      <div className="relative h-[62svh] min-h-[440px] w-full overflow-hidden bg-bg-1 md:h-[72dvh] md:min-h-[520px] md:max-h-[720px]">
        {slides.map((film, i) => (
          <Slide key={film.id} film={film} active={i === index} eager={i === 0} />
        ))}

        {/* Nav arrows — desktop only */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous"
          className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-3 text-cream-bright opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/60 group-hover/hero:opacity-100 md:inline-flex"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next"
          className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-3 text-cream-bright opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/60 group-hover/hero:opacity-100 md:inline-flex"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Dots */}
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2.5 md:bottom-6">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === index ? "w-8 bg-amber ring-4 ring-amber/20" : "w-2 bg-cream/25 hover:bg-cream/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Slide({ film, active, eager }: { film: HomeFeaturedFilm; active: boolean; eager: boolean }) {
  const { locale, num, year, t } = useLocale();
  const desktopImage = film.thumbnail_url || film.cover_url;
  const desktopSrcSet = [
    film.thumbnail_url_1280 ? `${film.thumbnail_url_1280} 1280w` : null,
    film.thumbnail_url ? `${film.thumbnail_url} 1920w` : null,
    film.thumbnail_url_2400 ? `${film.thumbnail_url_2400} 2400w` : null,
  ].filter(Boolean).join(", ");
  const mobileImage = film.mobile_cover_url || film.thumbnail_url_mobile || film.thumbnail_url || film.cover_url;
  const mobileSrcSet = [
    film.thumbnail_url_mobile ? `${film.thumbnail_url_mobile} 1080w` : null,
    film.thumbnail_url_1280 ? `${film.thumbnail_url_1280} 1280w` : null,
  ].filter(Boolean).join(", ");
  const fallbackBg =
    film.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";
  const title = t({ en: film.title_en, fa: film.title_fa || film.title_en });
  const director = film.category === "walking-tour" ? "" : t({ en: film.director_en || "", fa: film.director_fa || film.director_en || "" });
  const synopsis = t({ en: film.synopsis_en || "", fa: film.synopsis_fa || film.synopsis_en || "" });

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
        active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
      }`}
      aria-hidden={!active}
      style={{ background: fallbackBg }}
    >
      {mobileImage ? (
        <img
          src={mobileImage}
          srcSet={mobileSrcSet || undefined}
          alt={title}
          width={720}
          height={1280}
          className={`absolute inset-0 block h-full w-full object-cover object-center md:hidden ${
            active ? "cine-img-in" : ""
          }`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes="100vw"
        />
      ) : null}
      {desktopImage ? (
        <img
          src={desktopImage}
          srcSet={desktopSrcSet || undefined}
          alt={title}
          width={1600}
          height={900}
          className={`absolute inset-0 hidden h-full w-full object-cover object-center md:block ${
            active ? "cine-img-in" : ""
          }`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes="100vw"
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.10) 30%, rgba(13,13,13,0.55) 70%, var(--bg-0) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.55) 35%, rgba(13,13,13,0.15) 60%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex h-full items-end">
        <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 md:px-12 md:pb-16">
          <div className="max-w-xl">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center rounded bg-amber px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-md shadow-amber/20">
                {locale === "fa" ? "اختصاصی" : "Original"}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/60">
                {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
              </span>
            </div>
            <h2 className="font-display text-[2rem] font-medium leading-[1] tracking-[-0.03em] text-cream-bright drop-shadow-2xl sm:text-4xl md:text-5xl lg:text-6xl">
              {title}
            </h2>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium uppercase tracking-[0.24em] text-cream/60 md:mt-3 md:text-[11px]">
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
            </p>
            {synopsis ? (
              <p className="mt-3 hidden max-w-lg text-[13px] leading-relaxed text-cream/75 line-clamp-2 sm:block md:mt-4 md:text-sm">
                {synopsis}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-7">
              <Link
                to="/films/$slug"
                params={{ slug: film.slug }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber px-7 py-3 text-[13px] font-bold text-ink shadow-xl shadow-amber/10 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] md:px-8 md:py-3.5"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{locale === "fa" ? "تماشای فیلم" : "Watch Now"}</span>
              </Link>
              <Link
                to="/films/$slug"
                params={{ slug: film.slug }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream/20 bg-cream/10 px-6 py-3 text-[13px] font-semibold text-cream-bright backdrop-blur-md transition-all duration-200 hover:bg-cream/20 active:scale-[0.98] md:px-7 md:py-3.5"
              >
                {locale === "fa" ? "اطلاعات بیشتر" : "More info"}
              </Link>
              <WatchlistCta slug={film.slug} locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SingleSlide({ film }: { film: HomeFeaturedFilm }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[62svh] min-h-[440px] w-full overflow-hidden bg-bg-1 md:h-[72dvh] md:min-h-[520px] md:max-h-[720px]">
        <Slide film={film} active eager />
      </div>
    </section>
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
      className="hidden min-h-10 items-center gap-2 rounded-md border border-cream/30 bg-bg-0/70 px-5 py-2.5 text-[12px] font-medium text-cream-bright backdrop-blur-md transition-colors duration-300 hover:border-amber/50 hover:bg-amber/10 hover:text-amber-bright active:scale-[0.98] md:inline-flex md:bg-cream/10 md:px-6 md:py-3 md:text-[13px]"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {locale === "fa" ? "افزودن به فهرست" : "Add to Watchlist"}
    </Link>
  );
}

function FeaturedFilmFallback() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[62svh] min-h-[440px] w-full overflow-hidden bg-bg-0 md:h-[72dvh] md:min-h-[520px]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 70%, oklch(0.30 0.045 70 / 0.72), transparent 62%), linear-gradient(180deg, oklch(0.18 0 0), var(--bg-0))",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-0 via-bg-0/60 to-transparent" />
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 md:px-12 md:pb-16">
            <div className="max-w-xl">
              <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
                Original Iranian Cinema
              </span>
              <h2 className="font-display text-4xl font-medium leading-[0.95] tracking-[-0.03em] text-cream-bright sm:text-5xl md:text-6xl">
                ir.show
              </h2>
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-cream/75">
                A premium streaming home for Iranian films, documentaries, and curated stories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
