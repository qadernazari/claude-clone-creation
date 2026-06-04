import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "../integrations/supabase/client";
import { useLocale } from "../lib/i18n";

type Film = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  poster_gradient: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  is_premium: boolean | null;
};

export function FeaturedFilm() {
  const { locale, num, t } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["films", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, thumbnail_url, is_premium",
        )
        .eq("visibility", "published")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Film | null;
    },
    staleTime: 60_000,
  });

  if (isLoading) return <BrandHero />;
  if (!data) return <BrandHero />;

  const title = t({ en: data.title_en, fa: data.title_fa || data.title_fa || data.title_en });
  const director = t({
    en: data.director_en || "",
    fa: data.director_fa || data.director_en || "",
  });
  const synopsis = t({
    en: data.synopsis_en || "",
    fa: data.synopsis_fa || data.synopsis_en || "",
  });
  // Prefer the dedicated 16:9 hero/thumbnail image for the cinematic banner.
  // Only fall back to the vertical poster (cover_url) when no landscape art exists.
  const heroImage = data.thumbnail_url || data.cover_url;
  const isLandscapeHero = !!data.thumbnail_url;
  const fallbackBg =
    data.poster_gradient ||
    "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";


  return (
    <section className="relative isolate overflow-hidden">
      {/* Full-bleed cinematic hero — replaces the marketing hero entirely */}
      <div className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden bg-bg-0">
        {heroImage ? (
          isLandscapeHero ? (
            // 16:9 hero artwork — full-bleed cinematic banner
            <div
              className="absolute inset-0 cine-img"
              style={{
                background: `center / cover no-repeat url(${heroImage})`,
                transform: "scale(1.03)",
              }}
              aria-hidden
            />
          ) : (
            // Fallback: vertical poster — contain to preserve composition, blurred backdrop fills the frame
            <>
              <div
                className="absolute inset-0 scale-110"
                style={{
                  background: `center / cover no-repeat url(${heroImage})`,
                  filter: "blur(60px) saturate(1.1) brightness(0.55)",
                  opacity: 0.55,
                }}
                aria-hidden
              />
              <img
                src={heroImage}
                alt={title}
                className="absolute inset-0 h-full w-full object-contain object-center"
                loading="eager"
                decoding="async"
              />
            </>
          )
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
          <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 md:px-12 md:pb-20">
            <div className="max-w-2xl fade-up">
              <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
                {locale === "fa" ? "اثر برگزیده" : "Featured Film"}
              </span>
              <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-8xl">
                {title}
              </h1>
              <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.24em] text-cream/55">
                {director}
                {data.year ? <> {" · "} {num(data.year)}</> : null}
                {data.duration_min ? (
                  <>
                    {" · "}
                    {num(data.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                  </>
                ) : null}
              </p>
              {synopsis ? (
                <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-cream/75 md:text-base line-clamp-3">
                  {synopsis}
                </p>
              ) : null}
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex items-center gap-2.5 rounded-full bg-cream-bright px-8 py-3.5 text-sm font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {locale === "fa" ? "تماشای فیلم" : "Watch Now"}
                </Link>
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/[0.04] px-7 py-3.5 text-sm font-medium text-cream backdrop-blur-md transition-all duration-300 hover:border-cream/45 hover:bg-cream/10"
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

function BrandHero() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 25% 60%, oklch(0.30 0.04 60 / 0.55), transparent 60%), radial-gradient(ellipse at 75% 30%, oklch(0.77 0.115 80 / 0.08), transparent 55%), var(--bg-0)",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 md:px-12 md:pb-20">
            <div className="max-w-3xl fade-up">
              <span className="mb-6 inline-block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber">
                {fa ? "خانه‌ی سینمای ایران" : "Home of Iranian cinema"}
              </span>
              <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-[-0.03em] text-cream-bright sm:text-6xl md:text-7xl lg:text-8xl">
                {fa ? (
                  <>
                    سینما،{" "}
                    <span className="font-editorial italic font-normal text-amber">با صدای واقعی‌اش</span>.
                  </>
                ) : (
                  <>
                    Cinema, in its{" "}
                    <span className="font-editorial italic font-normal text-amber">true</span> voice.
                  </>
                )}
              </h1>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-cream/60 md:text-lg">
                {fa
                  ? "خانه‌ای برای سینمای مستقل ایران — آثار اصیل، مستندها و مجموعه‌های منتخب."
                  : "A premium streaming home for Iranian cinema — originals, documentaries, and curated collections."}
              </p>
              <div className="mt-10">
                <a
                  href="/browse"
                  className="inline-flex items-center gap-2.5 rounded-full bg-cream-bright px-8 py-3.5 text-sm font-semibold text-ink transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)]"
                >
                  {fa ? "تماشای آثار" : "Browse Originals"}
                  <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
