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
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, is_premium",
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

  if (isLoading || !data) return null;

  const title = t({ en: data.title_en, fa: data.title_fa || data.title_en });
  const director = t({
    en: data.director_en || "",
    fa: data.director_fa || data.director_en || "",
  });
  const synopsis = t({
    en: data.synopsis_en || "",
    fa: data.synopsis_fa || data.synopsis_en || "",
  });
  const bg = data.cover_url
    ? `center / cover no-repeat url(${data.cover_url})`
    : data.poster_gradient ||
      "linear-gradient(135deg, oklch(0.32 0.05 60) 0%, oklch(0.45 0.10 75) 100%)";

  return (
    <section className="relative isolate overflow-hidden">
      {/* Edge-to-edge cinematic backdrop */}
      <div className="relative h-[72vh] min-h-[520px] w-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: bg }} aria-hidden />
        {/* Smooth gradient fade to bg-0 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,13,0.45) 0%, rgba(13,13,13,0.15) 35%, rgba(13,13,13,0.75) 80%, var(--bg-0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(13,13,13,0.85) 0%, rgba(13,13,13,0.4) 40%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-12 md:pb-24">
            <div className="max-w-2xl fade-up">
              {data.is_premium && (
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-bright backdrop-blur">
                  {locale === "fa" ? "اکران ویژه" : "Premium Release"}
                </span>
              )}
              <h2 className="font-display text-4xl font-medium leading-[1.02] tracking-[-0.04em] text-cream-bright md:text-6xl lg:text-7xl">
                {title}
              </h2>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-cream/55">
                {director}
                {data.duration_min ? (
                  <>
                    {" · "}
                    {num(data.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
                  </>
                ) : null}
                {data.year ? <> {" · "} {num(data.year)}</> : null}
              </p>
              {synopsis ? (
                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-cream/75 md:text-base line-clamp-3">
                  {synopsis}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3 text-sm font-semibold text-ink transition-all duration-300 hover:bg-cream-bright hover:shadow-lg"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {locale === "fa" ? "تماشای فیلم" : "Watch Now"}
                </Link>
                <Link
                  to="/films/$slug"
                  params={{ slug: data.slug }}
                  className="inline-flex items-center rounded-full border border-cream/25 bg-cream/[0.03] px-7 py-3 text-sm font-medium text-cream backdrop-blur-sm transition-all duration-300 hover:border-cream/50 hover:bg-cream/10"
                >
                  {locale === "fa" ? "اطلاعات بیشتر" : "More Info"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
