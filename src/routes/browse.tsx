import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { browsePageQueryOptions, type BrowseFilm, type BrowseCategory } from "../lib/browse.functions";
import { useLocale } from "../lib/i18n";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";


const browseSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/browse")({
  validateSearch: zodValidator(browseSearchSchema),
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

type Film = BrowseFilm;

type Category = BrowseCategory;

type SortKey = "curated" | "newest" | "shortest" | "longest" | "title";

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

function BrowsePage() {
  const { locale, num, year, t } = useLocale();
  const { q: initialQ } = Route.useSearch();
  const [active, setActive] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("curated");
  const [q, setQ] = useState(initialQ);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const { data, isLoading } = useQuery(browsePageQueryOptions);
  const films = data?.films as Film[] | undefined;
  const categories = data?.categories as Category[] | undefined;

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
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-6 md:pb-28 md:pt-40">

        <header className="mb-4 max-w-3xl fade-up md:mb-14">
          <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
            {locale === "fa" ? "کاتالوگ" : "The Catalog"}
          </span>
          <h1 className="mt-3 font-display font-medium text-cream-bright text-[1.6rem] leading-[1.05] tracking-[-0.03em] sm:text-5xl md:mt-5 md:text-6xl">
            {locale === "fa" ? "همه‌ی فیلم‌ها" : "Every film, in one place"}
          </h1>
          <p className="mt-3 hidden max-w-xl text-[14px] leading-relaxed text-cream/55 md:mt-5 md:block md:text-[15px]">
            {locale === "fa"
              ? "با فیلتر دسته‌بندی، جست‌وجو و مرتب‌سازی، اثر بعدی‌ات را پیدا کن."
              : "Filter by category, search by title or director, and sort to find your next watch."}
          </p>
        </header>

        {/* Search + Sort — compact on mobile; sticky under the site header */}
        <div
          className="sticky z-20 -mx-5 mb-3 bg-bg-0/85 px-5 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:mb-10 md:flex md:items-center md:justify-between md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
          style={{ top: "56px" }}
        >
          <div className="flex items-center gap-2 md:max-w-sm md:flex-1 md:gap-3">
            <div className="relative flex-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-cream/40 md:start-4"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  locale === "fa" ? "جست‌وجو…" : "Search films…"
                }
                className="w-full rounded-full border border-cream/10 bg-bg-1/70 ps-10 pe-4 py-2 text-[13px] text-cream placeholder:text-cream/35 transition-all focus:border-cream/30 focus:bg-bg-1 focus:outline-none md:ps-11 md:pe-5 md:py-2.5 md:text-sm"
              />
            </div>
            {/* Compact filter button (mobile only) */}
            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              aria-label={locale === "fa" ? "مرتب‌سازی" : "Sort"}
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream/15 bg-bg-1/70 text-cream/70 transition-colors active:scale-95 active:bg-bg-1 md:hidden"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
              {sort !== "curated" && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cream" aria-hidden />
              )}
            </button>
          </div>
          {/* Desktop-only sort dropdown */}
          <div className="hidden items-center gap-3 text-xs text-cream/55 md:flex">
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
              {locale === "fa" ? "مرتب‌سازی" : "Sort"}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={locale === "fa" ? "مرتب‌سازی بر اساس" : "Sort by"}
              className="rounded-full border border-cream/10 bg-bg-1/70 px-4 py-2 text-cream transition-colors hover:border-cream/25 focus:border-cream/30 focus:outline-none"
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
          <div className="no-scrollbar -mx-5 mb-4 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:mb-10 md:flex-wrap md:overflow-visible md:px-0">
            <button
              type="button"
              onClick={() => setActive(null)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
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
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
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

        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/40 md:mb-8">
          {isLoading
            ? locale === "fa"
              ? "در حال بارگذاری…"
              : "Loading…"
            : `${num(filtered.length)} ${
                locale === "fa" ? "اثر" : filtered.length === 1 ? "film" : "films"
              }`}
        </p>

        {/* Mobile sort bottom sheet */}
        {sortSheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 animate-fade-in bg-ink/70 backdrop-blur-sm"
              onClick={() => setSortSheetOpen(false)}
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 animate-slide-up-sheet rounded-t-3xl border-t border-cream/10 bg-bg-1 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.6)]"
            >
              <div className="mx-auto mt-1 mb-3 h-1 w-10 rounded-full bg-cream/20" aria-hidden />
              <div className="px-5 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/40">
                  {locale === "fa" ? "مرتب‌سازی بر اساس" : "Sort by"}
                </p>
              </div>
              <ul className="px-2 pb-2">
                {sortOptions.map((o) => {
                  const selected = sort === o.key;
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSort(o.key);
                          setSortSheetOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-[15px] transition-colors active:bg-cream/6 ${
                          selected ? "text-cream-bright" : "text-cream/80"
                        }`}
                      >
                        <span>{o.label}</span>
                        {selected && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="text-cream" aria-hidden>
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-5 pt-2">
                <button
                  type="button"
                  onClick={() => setSortSheetOpen(false)}
                  className="h-11 w-full rounded-full border border-cream/15 text-[13px] font-medium text-cream/80 transition-colors active:bg-cream/6"
                >
                  {locale === "fa" ? "بستن" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}


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
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
            {filtered.map((film) => {
              const ftitle =
                locale === "fa" ? film.title_fa || film.title_en : film.title_en;
              const director =
                locale === "fa" ? film.director_fa || film.director_en : film.director_en;
              return (
                <Link
                  key={film.id}
                  to="/films/$slug"
                  params={{ slug: film.slug }}
                  className="group block"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 md:group-hover:-translate-y-1.5 md:group-hover:ring-cream/20 md:group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
                    {film.cover_url ? (
                      <img
                        src={film.cover_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="cine-img absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
                        aria-hidden
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="mt-3 px-0.5 md:mt-4">
                    <h3 className="font-display text-[13px] font-medium leading-snug tracking-[-0.01em] text-cream-bright line-clamp-1 md:text-[14px]">
                      {ftitle}
                    </h3>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cream/40 line-clamp-1 md:mt-1.5 md:text-[11px]">
                      {director}
                      {film.year ? <> {" · "} {year(film.year)}</> : null}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
