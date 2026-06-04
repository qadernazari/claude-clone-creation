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
      <main className="mx-auto max-w-7xl px-6 pb-28 pt-36 md:pt-40">

        <header className="mb-14 max-w-3xl fade-up">
          <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
            {locale === "fa" ? "کاتالوگ" : "The Catalog"}
          </span>
          <h1 className="mt-5 font-editorial italic font-normal text-cream-bright text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {locale === "fa" ? "همه‌ی فیلم‌ها" : "Every film, in one place"}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-cream/55">
            {locale === "fa"
              ? "با فیلتر دسته‌بندی، جست‌وجو و مرتب‌سازی، اثر بعدی‌ات را پیدا کن."
              : "Filter by category, search by title or director, and sort to find your next watch."}
          </p>
        </header>

        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              locale === "fa" ? "جست‌وجو در عنوان یا کارگردان…" : "Search title or director…"
            }
            className="w-full max-w-sm rounded-full border border-cream/10 bg-bg-1/60 px-5 py-2.5 text-sm text-cream placeholder:text-cream/35 transition-all focus:border-cream/30 focus:bg-bg-1 focus:outline-none"
          />
          <div className="flex items-center gap-3 text-xs text-cream/55">
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
              {locale === "fa" ? "مرتب‌سازی" : "Sort"}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={locale === "fa" ? "مرتب‌سازی بر اساس" : "Sort by"}
              className="rounded-full border border-cream/10 bg-bg-1/60 px-4 py-2 text-cream transition-colors hover:border-cream/25 focus:border-cream/30 focus:outline-none"
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

        <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/40">
          {isLoading
            ? locale === "fa"
              ? "در حال بارگذاری…"
              : "Loading…"
            : `${num(filtered.length)} ${
                locale === "fa" ? "اثر" : filtered.length === 1 ? "film" : "films"
              }`}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-bg-1" aria-hidden />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-cream/10 bg-bg-1/40 px-8 py-20 text-center">
            <p className="font-display text-xl text-cream-bright">
              {locale === "fa" ? "چیزی پیدا نشد" : "No films match"}
            </p>
            <p className="mt-2 text-sm text-cream/55">
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
                className="mt-6 text-[11px] font-medium uppercase tracking-[0.25em] text-cream/70 transition-colors hover:text-cream-bright"
              >
                {locale === "fa" ? "پاک‌سازی فیلترها" : "Clear filters"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
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
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/[0.06] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover:-translate-y-1.5 group-hover:ring-cream/20 group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
                    <div className="cine-img absolute inset-0" style={{ background: bg }} />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="mt-4 px-0.5">
                    <h3 className="font-display text-[14px] font-medium leading-snug tracking-[-0.01em] text-cream-bright line-clamp-1">
                      {ftitle}
                    </h3>
                    <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-cream/40 line-clamp-1">
                      {director}
                      {film.year ? <> {" · "} {num(film.year)}</> : null}
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
