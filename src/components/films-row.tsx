import { useMemo, useState } from "react";
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
  poster_gradient: string | null;
  cover_url: string | null;
};

type Category = { id: string; name_en: string; name_fa: string | null };

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

export function FilmsRow() {
  const { locale, num, t } = useLocale();
  const [active, setActive] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["films", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, poster_gradient, cover_url",
        )
        .eq("visibility", "published")
        .order("sort_order", { ascending: true })
        .limit(40);
      if (error) throw error;
      return data as Film[];
    },
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_en, name_fa")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60_000,
  });

  const usedCategoryIds = useMemo(
    () => new Set((data ?? []).map((f) => f.category).filter(Boolean) as string[]),
    [data],
  );
  const visibleCategories = (categories ?? []).filter((c) =>
    usedCategoryIds.has(c.id),
  );
  const filtered = active ? (data ?? []).filter((f) => f.category === active) : data;

  const title = locale === "fa" ? "آثار اختصاصی ایران" : "Iran Originals";
  const subtitle =
    locale === "fa"
      ? "آثار منتخب، با امضای فیلم‌سازان."
      : "Selected works, in the filmmakers' own voice.";

  return (
    <section className="hairline border-t">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-cream-bright md:text-4xl">{title}</h2>
            <p className="mt-2 text-sm text-cream/60">{subtitle}</p>
          </div>
          <a
            href="/browse"
            className="shrink-0 text-xs uppercase tracking-widest text-cream/70 underline-offset-4 hover:text-cream hover:underline"
          >
            {locale === "fa" ? "همه‌ی آثار ←" : "Browse all →"}
          </a>
        </div>

        {visibleCategories.length > 0 ? (
          <div className="mb-10 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActive(null)}
              className={`hairline rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                active === null
                  ? "bg-cream text-ink"
                  : "text-cream/70 hover:text-cream"
              }`}
            >
              {locale === "fa" ? "همه" : "All"}
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`hairline rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                  active === c.id
                    ? "bg-cream text-ink"
                    : "text-cream/70 hover:text-cream"
                }`}
              >
                {t({ en: c.name_en, fa: c.name_fa || c.name_en })}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl bg-bg-1"
                aria-hidden
              />
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="hairline rounded-2xl border bg-bg-1 px-8 py-16 text-center">
            <p className="font-display text-xl text-cream-bright">
              {locale === "fa" ? "به‌زودی، اولین آثار" : "First films, coming soon"}
            </p>
            <p className="mt-2 text-sm text-cream/60">
              {locale === "fa"
                ? "با ایمیل خود مشترک شوید تا لحظه‌ی انتشار باخبر شوید."
                : "Subscribe with your email to be notified when the first originals premiere."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((film) => {
              const ftitle = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
              const director =
                locale === "fa" ? film.director_fa || film.director_en : film.director_en;
              const bg = film.cover_url
                ? `center / cover no-repeat url(${film.cover_url})`
                : film.poster_gradient || fallbackGradient(film.id);
              return (
                <a key={film.id} href={`/films/${film.slug}`} className="group block">
                  <div
                    className="hairline relative aspect-[2/3] overflow-hidden rounded-xl border transition-transform group-hover:-translate-y-1"
                    style={{ background: bg }}
                  >
                    {film.category ? (
                      <span className="absolute left-3 top-3 rounded-full bg-bg-0/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-cream/80 backdrop-blur rtl:left-auto rtl:right-3">
                        {film.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 px-1">
                    <h3 className="font-display text-base text-cream-bright">{ftitle}</h3>
                    <p className="mt-1 text-xs text-cream/55">
                      {director}
                      {film.duration_min ? (
                        <>
                          {" · "}
                          {num(film.duration_min)}{" "}
                          {locale === "fa" ? "دقیقه" : "min"}
                        </>
                      ) : null}
                      {film.year ? <> {" · "} {num(film.year)} </> : null}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
