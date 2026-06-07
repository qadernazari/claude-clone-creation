import { useMemo, useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homePageQueryOptions, type HomeCategory, type HomeRailFilm } from "../lib/home.functions";

type Film = HomeRailFilm;
type Category = HomeCategory;

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

/* ---------- Card ---------- */
function PosterCard({ film, locale, year }: { film: Film; locale: string; year: (n: number) => string }) {
  const ftitle = locale === "fa" ? film.title_fa || film.title_en : film.title_en;
  const director = locale === "fa" ? film.director_fa || film.director_en : film.director_en;

  return (
    <Link
      to="/films/$slug"
      params={{ slug: film.slug }}
      preload="intent"
      className="group block w-[42vw] shrink-0 snap-start sm:w-[220px] md:w-[240px] lg:w-[260px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 md:group-hover:-translate-y-1.5 md:group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
        {film.cover_url ? (
          <img
            src={film.cover_url}
            alt=""
            width={520}
            height={780}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(min-width: 1024px) 260px, (min-width: 768px) 240px, (min-width: 640px) 220px, 42vw"
            className="cine-img absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
            aria-hidden
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 md:group-hover:opacity-100" />
        {/* Consistent hairline border on top of the image so it never washes out against light areas or gets clipped by overflow */}
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15 transition-[--tw-ring-color] duration-500 md:group-hover:ring-white/30" aria-hidden />
      </div>
      <div className="mt-3 px-0.5 md:mt-4">
        <h3 className="font-display text-[13px] font-medium leading-snug tracking-[-0.01em] text-cream-bright transition-colors line-clamp-1 md:text-[14px]">
          {ftitle}
        </h3>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cream/40 line-clamp-1 md:mt-1.5 md:text-[11px]">
          {director}
          {film.year ? <> {" · "} {year(film.year)}</> : null}
        </p>
      </div>
    </Link>
  );
}

/* ---------- Rail ---------- */
function Rail({
  eyebrow,
  title,
  subtitle,
  films,
  locale,
  year,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  films: Film[];
  locale: string;
  year: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (films.length === 0) return null;

  return (
    <section
      className="relative mx-auto max-w-[1400px] px-5 md:px-12 [content-visibility:auto] [contain-intrinsic-size:1px_520px]"
    >
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber/90">
              {eyebrow}
            </span>
          )}
          {title && (
            <h2 className="font-display text-[22px] font-medium tracking-[-0.02em] text-cream-bright md:text-[28px]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-2 text-[13px] text-cream/45">{subtitle}</p>
          )}
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/50 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>
      {/* Edge-fade mask: posters dissolve into background instead of hard-clipping */}
      <div
        ref={ref}
        className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-5 pt-2 pb-2 md:-mx-12 md:snap-mandatory md:gap-6 md:px-12 md:pt-3"
        style={{
          scrollPaddingLeft: "1.25rem",
          WebkitOverflowScrolling: "touch" as never,
          maskImage:
            "linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 56px), transparent 100%)",
        }}
      >
        {films.map((f) => (
          <PosterCard key={f.id} film={f} locale={locale} year={year} />
        ))}
        <div className="w-2 shrink-0 md:w-4" aria-hidden />
      </div>
    </section>
  );
}

/* ---------- Multi-rail container ---------- */
export function FilmsRow() {
  const { locale, num, year, t } = useLocale();
  const { data: homeData } = useSuspenseQuery(homePageQueryOptions);
  const films = homeData.films;
  const categories = homeData.categories;

  const rails = useMemo(() => {
    const all = films ?? [];
    if (all.length === 0) return [] as Array<{ key: string; eyebrow?: string; title: string; subtitle?: string; films: Film[] }>;

    const newReleases = all.slice(0, 12);
    const premium = all.filter((f) => f.is_premium || f.access_type === "ppv_only").slice(0, 12);
    const editors = [...all]
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .slice(0, 12);

    // Category rails (only categories with ≥3 published films)
    const byCat = new Map<string, Film[]>();
    for (const f of all) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    const catRails = (categories ?? [])
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 3)
      .slice(0, 4)
      .map((c) => ({
        key: `cat-${c.id}`,
        eyebrow: locale === "fa" ? "مجموعه" : "Collection",
        title: t({ en: c.name_en, fa: c.name_fa || c.name_en }) || c.name_en,
        films: byCat.get(c.id) ?? [],
      }));

    const out: Array<{ key: string; eyebrow?: string; title: string; subtitle?: string; films: Film[] }> = [];

    out.push({
      key: "originals",
      title: locale === "fa" ? "آثار اختصاصی ایران" : "Iranian Originals",
      subtitle:
        locale === "fa"
          ? "آثار منتخب، با امضای فیلم‌سازان."
          : "Signature works, in the filmmakers' own voice.",
      films: editors,
    });

    out.push({
      key: "new",
      title: locale === "fa" ? "آثار تازه" : "New Releases",
      films: newReleases,
    });


    out.push(...catRails);
    return out;
  }, [films, categories, locale, t]);

  if (rails.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12">
        <p className="font-display text-xl text-cream-bright">
          {locale === "fa" ? "به‌زودی، اولین آثار" : "First films, coming soon"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14 md:space-y-16">
      {rails.map((r) => (
        <Rail
          key={r.key}
          eyebrow={r.eyebrow}
          title={r.title}
          subtitle={r.subtitle}
          films={r.films}
          locale={locale}
          year={year}
        />
      ))}
    </div>
  );
}
