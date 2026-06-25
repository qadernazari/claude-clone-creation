import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homeFeaturedQueryOptions, type HomeFeaturedFilm } from "../lib/home.functions";
import { useCurrentUser } from "@/hooks/use-subscription";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

type Film = HomeFeaturedFilm;

export function FeaturedFilm() {
  const { locale, num, year, t } = useLocale();
  const { data } = useSuspenseQuery(homeFeaturedQueryOptions);
  // Desktop hero = 16:9 cinematic art (thumbnail_url) with cover_url as fallback.
  // Mobile hero = dedicated 9:16 portrait art (mobile_cover_url). When no mobile
  // art exists, fall back to the portrait cover_url; only as a last resort use the
  // landscape thumbnail (which will look cropped on a phone).
  const desktopImage = data ? data.thumbnail_url || data.cover_url : null;
  const mobileImage = data ? data.mobile_cover_url || data.cover_url || data.thumbnail_url : null;
  const mobileImageRef = useRef<HTMLImageElement | null>(null);
  const desktopImageRef = useRef<HTMLImageElement | null>(null);
  const [mobileImageReady, setMobileImageReady] = useState(false);
  const [desktopImageReady, setDesktopImageReady] = useState(false);

  useEffect(() => {
    setMobileImageReady(false);
    const img = mobileImageRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      requestAnimationFrame(() => setMobileImageReady(true));
    }
  }, [mobileImage]);

  useEffect(() => {
    setDesktopImageReady(false);
    const img = desktopImageRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      requestAnimationFrame(() => setDesktopImageReady(true));
    }
  }, [desktopImage]);

  if (!data) return <FeaturedFilmFallback />;



  const title = t({ en: data.title_en, fa: data.title_fa || data.title_fa || data.title_en });
  const director = t({
    en: data.director_en || "",
    fa: data.director_fa || data.director_en || "",
  });
  const synopsis = t({
    en: data.synopsis_en || "",
    fa: data.synopsis_fa || data.synopsis_en || "",
  });
  const hasAnyImage = !!(desktopImage || mobileImage);
  const isDesktopLandscape = !!data.thumbnail_url;
  const fallbackBg =
    data.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";
  


  return (
    <section className="relative isolate overflow-hidden">
      {/* Full-bleed cinematic hero — replaces the marketing hero entirely */}
      <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-bg-1 md:h-[100dvh] md:min-h-[640px]" style={{ background: fallbackBg }} data-mobile-hero>
        {/* Warm poster placeholder painted immediately by SSR — keeps the
            hero looking intentional (not an empty black box) until the
            actual image decodes. Hidden once the image is loaded. */}
        <div
          className="hero-mobile-poster pointer-events-none absolute inset-0 md:hidden"
          style={{ background: fallbackBg }}
          aria-hidden
        />
        {hasAnyImage ? (
          <>
            {/*
              Hero images. IMPORTANT: do NOT set fetchPriority="high" on
              these <img> tags. React 19 hoists every high-priority img
              src into an unconditional ReactDOM.preload() in <head>,
              ignoring media queries / Tailwind responsive classes — which
              caused mobile to also download the 1920w desktop thumbnail.
              The correct preload (with `media`) is emitted by the route
              `head()` in src/routes/index.tsx.
            */}
            {mobileImage ? (
              <img
                ref={mobileImageRef}
                src={mobileImage}
                alt=""
                width={720}
                height={1280}
                className="hero-mobile-img cine-img absolute inset-x-0 bottom-0 top-0 h-full w-full object-cover object-top opacity-0 transition-opacity duration-700 ease-out md:hidden"
                style={{ opacity: mobileImageReady ? 1 : 0 }}
                loading="eager"
                decoding="async"
                sizes="100vw"
                aria-hidden
                onLoad={() => setMobileImageReady(true)}
              />
            ) : null}


            {/* Desktop / tablet: 16:9 cinematic art.
                loading="lazy" here is critical: React 19 auto-hoists every
                eager <img> into an unconditional <link rel=preload> in <head>,
                which on mobile caused the 1600w desktop thumbnail to be
                downloaded alongside the real mobile cover. Lazy disables
                that auto-preload; the correct media-gated preload still
                fires from the route head() on real desktops. */}
            {desktopImage ? (
              isDesktopLandscape ? (
                <img
                  ref={desktopImageRef}
                  src={desktopImage}
                  alt=""
                  width={1600}
                  height={900}
                  className="cine-img absolute inset-0 hidden h-full w-full scale-[1.03] object-cover object-center opacity-0 transition-opacity duration-700 ease-out md:block"
                  style={{ opacity: desktopImageReady ? 1 : 0 }}
                  loading="lazy"
                  decoding="async"
                  aria-hidden
                  onLoad={() => setDesktopImageReady(true)}
                />
              ) : (
                <div className="absolute inset-0 hidden md:block">
                  <div
                    className="absolute inset-0 scale-110"
                    style={{
                      background: `center / cover no-repeat url(${desktopImage})`,
                      filter: "blur(60px) saturate(1.1) brightness(0.55)",
                      opacity: 0.55,
                    }}
                    aria-hidden
                  />
                  <img
                    ref={desktopImageRef}
                    src={desktopImage}
                    alt={title}
                    width={1200}
                    height={1600}
                    className="absolute inset-0 h-full w-full object-contain object-center opacity-0 transition-opacity duration-700 ease-out"
                    style={{ opacity: desktopImageReady ? 1 : 0 }}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setDesktopImageReady(true)}
                  />
                </div>
              )
            ) : null}
          </>
        ) : (
          <div
            className="absolute inset-0 cine-img"
            style={{ background: fallbackBg }}
            aria-hidden
          />
        )}
        {/* Vertical fade for legibility + handoff to bg-0 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.10) 30%, rgba(13,13,13,0.55) 70%, var(--bg-0) 100%)",
          }}
        />
        {/* Horizontal fade — lights the left side where copy lives */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.55) 35%, rgba(13,13,13,0.15) 60%, transparent 80%)",
          }}
        />


        {/* Content */}
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-8 sm:px-6 md:px-12 md:pb-20">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber md:mb-5">
                {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
              </span>
              <h1 className="font-display text-[2.5rem] font-medium leading-[0.98] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-8xl">
                {title}
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium uppercase tracking-[0.24em] text-cream/60 md:mt-5 md:text-[11px]">
                {director && <span>{director}</span>}
                {director && data.year ? <span className="text-amber/60">·</span> : null}
                {data.year ? <span>{year(data.year)}</span> : null}
                {data.duration_min ? (
                  <>
                    <span className="text-amber/60">·</span>
                    <span>
                      {num(data.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                    </span>
                  </>
                ) : null}
              </p>
              {synopsis ? (
                <p className="mt-5 hidden max-w-xl text-[14px] leading-relaxed text-cream/75 line-clamp-3 sm:line-clamp-3 sm:block md:mt-7 md:text-base">
                  {synopsis}
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-3">
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-md bg-cream-bright px-7 py-3 text-[13px] font-semibold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] md:px-8 md:py-3.5 md:text-sm"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>{locale === "fa" ? "تماشای فیلم" : "Watch Now"}</span>
                </Link>
                <WatchlistCta slug={data.slug} locale={locale} />

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Desktop-only secondary CTA. Hidden on mobile (md:inline-flex), and even
 * on desktop the auth check is deferred until idle so useCurrentUser
 * doesn't run during hero hydration.
 */
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
      className="hidden min-h-11 items-center gap-2 rounded-md border border-cream/30 bg-bg-0/70 px-6 py-3 text-[13px] font-medium text-cream-bright backdrop-blur-md transition-colors duration-300 hover:border-amber/50 hover:bg-amber/10 hover:text-amber-bright active:scale-[0.98] md:inline-flex md:bg-cream/10 md:px-7 md:py-3.5 md:text-sm"
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
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-bg-0 md:h-[100dvh] md:min-h-[640px]">
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
          <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 md:px-12 md:pb-20">
            <div className="max-w-2xl">
              <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
                Original Iranian Cinema
              </span>
              <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-8xl">
                ir.show
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-cream/75 md:text-base">
                A premium streaming home for Iranian films, documentaries, and curated stories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
