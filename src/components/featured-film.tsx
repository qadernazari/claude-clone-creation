import { useQuery } from "@tanstack/react-query";
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
};

export function FeaturedFilm() {
  const { locale, num, t } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["films", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url",
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
    <section className="hairline border-t">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
          {locale === "fa" ? "اثر برگزیده" : "Now featured"}
        </p>
        <a
          href={`/films/${data.slug}`}
          className="hairline group relative block overflow-hidden rounded-2xl border"
        >
          <div
            className="aspect-[21/9] w-full transition-transform duration-700 group-hover:scale-[1.02]"
            style={{ background: bg }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <h2 className="font-display text-3xl text-cream-bright md:text-5xl">
              {title}
            </h2>
            <p className="mt-2 text-sm text-cream/70">
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
              <p className="mt-4 max-w-2xl text-sm text-cream/65 md:text-base line-clamp-2">
                {synopsis}
              </p>
            ) : null}
            <span className="mt-6 inline-flex items-center rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink transition-colors group-hover:bg-cream-bright">
              {locale === "fa" ? "تماشای فیلم" : "Watch now"}
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
