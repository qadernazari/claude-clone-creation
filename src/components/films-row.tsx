import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useLocale } from "../lib/i18n";
import type { Database } from "../integrations/supabase/types";

type AccessType = Database["public"]["Enums"]["film_access_type"];

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
  access_type: AccessType;
  is_premium: boolean | null;
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
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, poster_gradient, cover_url, access_type, is_premium",
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
  const visibleCategories = (categories ?? []).filter((c) => usedCategoryIds.has(c.id));
  const filtered = active ? (data ?? []).filter((f) => f.category === active) : data;

  const title = locale === "fa" ? "آثار اختصاصی ایران" : "Iran Originals";
  const subtitle =
    locale === "fa"
      ? "آثار منتخب، با امضای فیلم‌سازان."
      : "Selected works, in the filmmakers' own voice.";

  return (
    <section>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-medium tracking-[-0.03em] text-cream-bright md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-base text-cream/55">{subtitle}</p>
        </div>

        {visibleCategories.length > 0 ? (
          <div className="mb-10 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActive(null)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-300 ${
                active === null
                  ? "bg-cream text-ink"
                  : "bg-cream/[0.06] text-cream/65 hover:bg-cream/10 hover:text-cream"
              }`}
            >
              {locale === "fa" ? "همه" : "All"}
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-300 ${
                  active === c.id
                    ? "bg-cream text-ink"
                    : "bg-cream/[0.06] text-cream/65 hover:bg-cream/10 hover:text-cream"
                }`}
              >
                {t({ en: c.name_en, fa: c.name_fa || c.name_en })}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-bg-1" aria-hidden />
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="rounded-2xl border border-cream/10 bg-bg-1/40 px-8 py-20 text-center">
            <p className="font-display text-xl text-cream-bright">
              {locale === "fa" ? "به‌زودی، اولین آثار" : "First films, coming soon"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
            {filtered.map((film) => {
              const ftitle = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
              const director =
                locale === "fa" ? film.director_fa || film.director_en : film.director_en;
              const bg = film.cover_url
                ? `center / cover no-repeat url(${film.cover_url})`
                : film.poster_gradient || fallbackGradient(film.id);
              const isPremium = !!film.is_premium || film.access_type === "ppv_only";
              return (
                <a key={film.id} href={`/films/${film.slug}`} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/[0.06] transition-all duration-500 group-hover:ring-cream/15 group-hover:shadow-2xl">
                    <div className="cine-img absolute inset-0" style={{ background: bg }} />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/85 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    {isPremium ? (
                      <span className="absolute right-3 top-3 rounded-full bg-bg-0/75 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-bright backdrop-blur-md rtl:right-auto rtl:left-3">
                        {locale === "fa" ? "ویژه" : "Premium"}
                      </span>
                    ) : (
                      <span className="absolute right-3 top-3 rounded-full bg-bg-0/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cream/85 backdrop-blur-md opacity-0 transition-opacity duration-500 group-hover:opacity-100 rtl:right-auto rtl:left-3">
                        {locale === "fa" ? "اشتراکی" : "Included"}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 px-0.5">
                    <h3 className="font-display text-[15px] font-medium leading-tight tracking-[-0.02em] text-cream-bright transition-colors group-hover:text-amber-bright">
                      {ftitle}
                    </h3>
                    <p className="mt-1.5 text-[12px] text-cream/50">
                      {director}
                      {film.duration_min ? (
                        <>
                          {" · "}
                          {num(film.duration_min)} {locale === "fa" ? "دقیقه" : "min"}
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
