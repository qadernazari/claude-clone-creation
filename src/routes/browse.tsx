import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { browsePageQueryOptions, getBrowsePageData } from "../lib/browse.functions";
import { getHomeFeatured } from "../lib/home.functions";
import type { BrowseFilm, BrowseCategory } from "../lib/browse.types";
import { useLocale } from "../lib/i18n";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";


const browseSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

const FALLBACK_OG = "https://yasfnvftzwyuxdhpysof.supabase.co/storage/v1/render/image/sign/film-thumbnails/new-film/a2e2704d-324f-4ef7-b294-c552fcb803d4.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zODlhNWU3Yi0zYzdmLTQ5YWMtYjQ3YS04ODQ2NGM5YjhiMGIiLCJhbGciOiJIUzI1NiJ9.eyJ0cmFuc2Zvcm1hdGlvbnMiOiJ3aWR0aDoxNDAwLHJlc2l6ZTpjb250YWluLHF1YWxpdHk6NzAiLCJ1cmwiOiJmaWxtLXRodW1ibmFpbHMvbmV3LWZpbG0vYTJlMjcwNGQtMzI0Zi00ZWY3LWIyOTQtYzU1MmZjYjgwM2Q0LmpwZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI1MDE4OTAsImV4cCI6MTgxNDAzNzg5MH0.UEBH4vlm8e04xbsMidizKO34WhNkmFMs5Om0yphoSB0";

export const Route = createFileRoute("/browse")({
  validateSearch: zodValidator(browseSearchSchema),
  loader: async () => {
    // SSR-critical: fetch directly through the route loader and pass the
    // result as loaderData/initialData. Wrapped in try/catch so a server-side
    // fetch failure doesn't kill SSR — the page still renders with empty
    // state, and the client query can recover.
    try {
      const [browseData, featured] = await Promise.all([
        getBrowsePageData(),
        getHomeFeatured().catch(() => null),
      ]);
      return {
        ...browseData,
        ogImage: featured?.thumbnail_url || featured?.cover_url || null,
      };
    } catch (err) {
      console.error("[browse loader] failed:", err);
      return {
        films: [] as BrowseFilm[],
        categories: [] as BrowseCategory[],
        ogImage: null as string | null,
      };
    }
  },
  pendingComponent: () => null,
  head: ({ loaderData }) => {
    const ogImage = loaderData?.ogImage || FALLBACK_OG;
    return {
    meta: [
      { title: "Browse films — All originals" },
      {
        name: "description",
        content:
          "Explore every film in the catalog. Sort by newest, duration, or our curated order. Iranian cinema, streaming worldwide.",
      },
      { property: "og:title", content: "Browse films" },
      {
        property: "og:description",
        content:
          "Explore every film in the catalog. Sort by newest, duration, or our curated order. Iranian cinema, streaming worldwide.",
      },
      { property: "og:url", content: "https://ir.show/browse" },
      { property: "og:site_name", content: "IRAN" },
      { property: "og:image" as const, content: ogImage },
      { name: "twitter:image" as const, content: ogImage },
      { name: "twitter:card" as const, content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/browse" }],
    };
  },
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

  const loaderData = Route.useLoaderData();
  const { data } = useSuspenseQuery({
    ...browsePageQueryOptions,
    initialData: loaderData,
  });
  const films = data.films as Film[];
  const categories = data.categories as Category[];
  const isLoading = false;

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
                className="w-full rounded-md border border-cream/10 bg-bg-1/70 ps-10 pe-4 py-2 text-[13px] text-cream placeholder:text-cream/35 transition-all focus:border-cream/30 focus:bg-bg-1 focus:outline-none md:ps-11 md:pe-5 md:py-2.5 md:text-sm"
              />
            </div>
            {/* Compact filter button (mobile only) */}
            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              aria-label={locale === "fa" ? "مرتب‌سازی" : "Sort"}
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cream/15 bg-bg-1/70 text-cream/70 transition-colors active:scale-95 active:bg-bg-1 md:hidden"
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
              className="rounded-md border border-cream/10 bg-bg-1/70 px-4 py-2 text-cream transition-colors hover:border-cream/25 focus:border-cream/30 focus:outline-none"
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
              className={`shrink-0 rounded-md border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
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
                className={`shrink-0 rounded-md border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
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
          {`${num(filtered.length)} ${
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
                        className={`flex w-full items-center justify-between rounded-md px-4 py-3.5 text-left text-[15px] transition-colors active:bg-cream/6 ${
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
                  className="h-11 w-full rounded-md border border-cream/15 text-[13px] font-medium text-cream/80 transition-colors active:bg-cream/6"
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
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-amber/30 bg-amber/5 text-amber" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <span className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber/90">
              {locale === "fa" ? "جست‌وجو" : "Search"}
            </span>
            <h3 className={`font-display text-xl font-medium tracking-[-0.01em] text-cream-bright md:text-2xl ${locale === "fa" ? "font-vazir" : ""}`}>
              {locale === "fa" ? "چیزی پیدا نشد" : "No films match"}
            </h3>
            <div className="mx-auto mt-5 h-px w-12 bg-amber/40" aria-hidden />
            <p className="mt-5 text-sm leading-relaxed text-cream/55">
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
                className="mt-7 inline-flex min-h-11 items-center rounded-md border border-cream/25 px-6 py-3 text-[13px] font-medium text-cream/85 transition-all duration-300 hover:border-amber/50 hover:text-amber"
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
                  preload="intent"
                  className="group block"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-[320ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] md:group-hover:-translate-y-1.5 md:group-hover:ring-cream/20 md:group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
                    {film.cover_url ? (
                      <img
                        src={film.cover_url}
                        alt=""
                        width={520}
                        height={780}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        sizes="(min-width: 1024px) 280px, (min-width: 768px) 240px, 45vw"
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
