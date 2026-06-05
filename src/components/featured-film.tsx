import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homePageQueryOptions, type HomeFeaturedFilm } from "../lib/home.functions";
import { useCurrentUser } from "@/hooks/use-subscription";

type Film = HomeFeaturedFilm;

export function FeaturedFilm() {
  const { locale, num, year, t } = useLocale();
  const { data: homeData } = useSuspenseQuery(homePageQueryOptions);
  const data = homeData.featured;

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
  // Desktop hero = 16:9 cinematic art (thumbnail_url) with cover_url as fallback.
  // Mobile hero = dedicated 9:16 portrait art (mobile_cover_url). When no mobile
  // art exists, fall back to the portrait cover_url; only as a last resort use the
  // landscape thumbnail (which will look cropped on a phone).
  const desktopImage = data.thumbnail_url || data.cover_url;
  const mobileImage = data.mobile_cover_url || data.cover_url || data.thumbnail_url;
  const hasAnyImage = !!(desktopImage || mobileImage);
  const isDesktopLandscape = !!data.thumbnail_url;
  const fallbackBg =
    data.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";


  return (
    <section className="relative isolate overflow-hidden">
      {/* Full-bleed cinematic hero — replaces the marketing hero entirely */}
      <div className="relative h-[82svh] min-h-[520px] w-full overflow-hidden bg-bg-0 md:h-[100dvh] md:min-h-[640px]">
        {hasAnyImage ? (
          <>
            {/* Mobile: dedicated 9:16 vertical poster */}
            {mobileImage ? (
              <img
                src={mobileImage}
                alt=""
                className="cine-img absolute inset-0 h-full w-full object-cover object-center md:hidden"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                aria-hidden
              />
            ) : null}
            {/* Desktop / tablet: 16:9 cinematic art */}
            {desktopImage ? (
              isDesktopLandscape ? (
                <img
                  src={desktopImage}
                  alt=""
                  className="cine-img absolute inset-0 hidden h-full w-full scale-[1.03] object-cover object-center md:block"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  aria-hidden
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
                    src={desktopImage}
                    alt={title}
                    className="absolute inset-0 h-full w-full object-contain object-center"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
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
              <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.24em] text-cream/55 md:mt-5 md:text-[11px]">
                {director}
                {data.year ? <> {" · "} {year(data.year)}</> : null}
                {data.duration_min ? (
                  <>
                    {" · "}
                    {num(data.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                  </>
                ) : null}
              </p>
              {synopsis ? (
                <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-cream/75 line-clamp-3 md:mt-7 md:text-base">
                  {synopsis}
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-3">
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-cream-bright px-7 py-3 text-[13px] font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)] active:scale-[0.98] md:px-8 md:py-3.5 md:text-sm"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {locale === "fa" ? "تماشای فیلم" : "Watch Now"}
                </Link>
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream/20 bg-cream/[4%] px-6 py-3 text-[13px] font-medium text-cream backdrop-blur-md transition-all duration-300 hover:border-cream/45 hover:bg-cream/10 active:scale-[0.98] md:px-7 md:py-3.5 md:text-sm"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {locale === "fa" ? "افزودن به فهرست" : "Add to Watchlist"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedFilmFallback() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden bg-bg-0">
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
