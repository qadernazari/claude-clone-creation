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
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.35em] text-amber">
              {locale === "fa" ? "آثار" : "Originals"}
            </span>
            <h2 className="font-display text-3xl leading-[0.95] text-cream-bright md:text-5xl">{title}</h2>
            <p className="mt-3 max-w-md text-sm text-cream/55">{subtitle}</p>
          </div>
          <a
            href="/browse"
            className="group hidden shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cream/60 transition-colors hover:text-amber md:inline-flex"
          >
            {locale === "fa" ? "همه‌ی آثار" : "Browse all"}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </div>

        {visibleCategories.length > 0 ? (
          <div className="mb-10 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActive(null)}
              className={`rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                active === null
                  ? "border-cream bg-cream text-ink"
                  : "border-cream/15 text-cream/55 hover:border-cream/40 hover:text-cream"
              }`}
            >
              {locale === "fa" ? "همه" : "All"}
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                  active === c.id
                    ? "border-cream bg-cream text-ink"
                    : "border-cream/15 text-cream/55 hover:border-cream/40 hover:text-cream"
                }`}
              >
                {t({ en: c.name_en, fa: c.name_fa || c.name_en })}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-bg-1" aria-hidden />
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="rounded-2xl border border-cream/10 bg-bg-1/40 px-8 py-20 text-center">
            <p className="font-display text-xl text-cream-bright">
              {locale === "fa" ? "به‌زودی، اولین آثار" : "First films, coming soon"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-cream/55">
              {locale === "fa"
                ? "با ایمیل خود مشترک شوید تا لحظه‌ی انتشار باخبر شوید."
                : "Subscribe with your email to be notified when the first originals premiere."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4">
            {filtered.map((film) => {
              const ftitle = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
              const director =
                locale === "fa" ? film.director_fa || film.director_en : film.director_en;
              const bg = film.cover_url
                ? `center / cover no-repeat url(${film.cover_url})`
                : film.poster_gradient || fallbackGradient(film.id);
              return (
                <a key={film.id} href={`/films/${film.slug}`} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-1">
                    <div className="cine-img absolute inset-0" style={{ background: bg }} />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/85 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    {film.category ? (
                      <span className="absolute left-3 top-3 rounded-full bg-bg-0/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-cream/85 backdrop-blur-md rtl:left-auto rtl:right-3">
                        {film.category}
                      </span>
                    ) : null}
                    <span className="pointer-events-none absolute bottom-3 right-3 translate-y-2 rounded-full bg-amber px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 rtl:right-auto rtl:left-3">
                      {locale === "fa" ? "تماشا" : "Watch"}
                    </span>
                  </div>
                  <div className="mt-4 px-0.5">
                    <h3 className="font-display text-[15px] leading-tight text-cream-bright transition-colors group-hover:text-amber-bright">
                      {ftitle}
                    </h3>
                    <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-cream/45">
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
