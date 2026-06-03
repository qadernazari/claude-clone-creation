import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useLocale } from "../lib/i18n";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";


export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse films — All originals" },
      {
        name: "description",
        content:
          "Explore every film in the catalog. Filter by category, sort by newest or duration, and find your next watch.",
      },
      { property: "og:title", content: "Browse films" },
      {
        property: "og:description",
        content: "Every film in the catalog, filterable by category and sort.",
      },
      { property: "og:url", content: "https://ir.show/browse" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/browse" }],
  }),
  component: BrowsePage,
  errorComponent: ({ error }) => {
    console.error("browse error:", error);
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center text-cream/70">
        Couldn't load the catalog. Please try again.
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center text-cream/70">
      Not found.
    </div>
  ),
});

type Film = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  poster_gradient: string | null;
  cover_url: string | null;
  created_at: string;
  sort_order: number;
};

type Category = { id: string; name_en: string; name_fa: string | null };

type SortKey = "curated" | "newest" | "shortest" | "longest" | "title";

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

function BrowsePage() {
  const { locale, num, t } = useLocale();
  const [active, setActive] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("curated");
  const [q, setQ] = useState("");

  const { data: films, isLoading } = useQuery({
    queryKey: ["films", "browse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, synopsis_en, synopsis_fa, category, year, duration_min, poster_gradient, cover_url, created_at, sort_order",
        )
        .eq("visibility", "published")
        .limit(200);
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
    () => new Set((films ?? []).map((f) => f.category).filter(Boolean) as string[]),
    [films],
  );
  const visibleCategories = (categories ?? []).filter((c) => usedCategoryIds.has(c.id));

  const filtered = useMemo(() => {
    let list = films ?? [];
    if (active) list = list.filter((f) => f.category === active);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((f) =>
        [f.title_en, f.title_fa, f.director_en, f.director_fa]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(needle)),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "shortest":
        sorted.sort((a, b) => (a.duration_min ?? 9999) - (b.duration_min ?? 9999));
        break;
      case "longest":
        sorted.sort((a, b) => (b.duration_min ?? 0) - (a.duration_min ?? 0));
        break;
      case "title":
        sorted.sort((a, b) =>
          (locale === "fa" ? a.title_fa || a.title_en : a.title_en).localeCompare(
            locale === "fa" ? b.title_fa || b.title_en : b.title_en,
          ),
        );
        break;
      default:
        sorted.sort((a, b) => a.sort_order - b.sort_order);
    }
    return sorted;
  }, [films, active, q, sort, locale]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "curated", label: locale === "fa" ? "ترتیب منتخب" : "Curated" },
    { key: "newest", label: locale === "fa" ? "جدیدترین" : "Newest" },
    { key: "shortest", label: locale === "fa" ? "کوتاه‌ترین" : "Shortest" },
    { key: "longest", label: locale === "fa" ? "بلندترین" : "Longest" },
    { key: "title", label: locale === "fa" ? "نام" : "Title" },
  ];

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <SiteHeader current="browse" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">

        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/50">
            {locale === "fa" ? "کاتالوگ" : "Catalog"}
          </p>
          <h1 className="mt-3 font-display text-4xl text-cream-bright md:text-5xl">
            {locale === "fa" ? "همه‌ی فیلم‌ها" : "Browse every film"}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-cream/60">
            {locale === "fa"
              ? "با فیلتر دسته‌بندی، جست‌وجو و مرتب‌سازی، اثر بعدی‌ات را پیدا کن."
              : "Filter by category, search by title or director, and sort to find your next watch."}
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              locale === "fa" ? "جست‌وجو در عنوان یا کارگردان…" : "Search title or director…"
            }
            className="hairline w-full max-w-sm rounded-full border bg-bg-1 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:ring-1 focus:ring-cream/30"
          />
          <div className="flex items-center gap-2 text-xs text-cream/60">
            <span className="uppercase tracking-widest">
              {locale === "fa" ? "مرتب‌سازی" : "Sort"}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={locale === "fa" ? "مرتب‌سازی بر اساس" : "Sort by"}
              className="hairline rounded-full border bg-bg-1 px-3 py-1.5 text-cream focus:outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visibleCategories.length > 0 ? (
          <div className="mb-10 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActive(null)}
              className={`hairline rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                active === null ? "bg-cream text-ink" : "text-cream/70 hover:text-cream"
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
                  active === c.id ? "bg-cream text-ink" : "text-cream/70 hover:text-cream"
                }`}
              >
                {t({ en: c.name_en, fa: c.name_fa || c.name_en })}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mb-6 text-xs uppercase tracking-widest text-cream/50">
          {isLoading
            ? locale === "fa"
              ? "در حال بارگذاری…"
              : "Loading…"
            : `${num(filtered.length)} ${
                locale === "fa" ? "اثر" : filtered.length === 1 ? "film" : "films"
              }`}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl bg-bg-1"
                aria-hidden
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="hairline rounded-2xl border bg-bg-1 px-8 py-16 text-center">
            <p className="font-display text-xl text-cream-bright">
              {locale === "fa" ? "چیزی پیدا نشد" : "No films match"}
            </p>
            <p className="mt-2 text-sm text-cream/60">
              {locale === "fa"
                ? "فیلترها یا واژه‌ی جست‌وجو را تغییر بده."
                : "Try clearing filters or searching for something else."}
            </p>
            {(active || q) && (
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setQ("");
                }}
                className="mt-6 text-xs uppercase tracking-widest text-cream/70 underline-offset-4 hover:underline"
              >
                {locale === "fa" ? "پاک‌سازی فیلترها" : "Clear filters"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((film) => {
              const ftitle =
                locale === "fa" ? film.title_fa || film.title_en : film.title_en;
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
      </main>
      <SiteFooter />
    </div>
  );
}
