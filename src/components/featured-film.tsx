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
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mb-8 flex items-end justify-between gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber">
            {locale === "fa" ? "اثر برگزیده" : "Now featured"}
          </span>
          <span className="hidden h-px flex-1 bg-cream/10 md:block" />
        </div>
        <a
          href={`/films/${data.slug}`}
          className="group relative block overflow-hidden rounded-xl"
        >
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-bg-1">
            <div
              className="cine-img absolute inset-0"
              style={{ background: bg }}
              aria-hidden
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/40 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-0/70 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-12">
            <h2 className="font-display text-4xl leading-[0.95] text-cream-bright md:text-7xl">
              {title}
            </h2>
            <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-cream/65">
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
              <p className="mt-5 max-w-2xl text-sm text-cream/70 md:text-base line-clamp-2">
                {synopsis}
              </p>
            ) : null}
            <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-all duration-300 group-hover:bg-amber-bright group-hover:gap-3">
              <span>▶</span>
              {locale === "fa" ? "تماشای فیلم" : "Watch now"}
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
