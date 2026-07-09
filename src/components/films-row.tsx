import { useMemo, useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homeRailsQueryOptions, type HomeCategory, type HomeRailFilm } from "../lib/home.functions";

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
  const director = film.category === "walking-tour" ? "" : (locale === "fa" ? film.director_fa || film.director_en : film.director_en);
  const railImg = film.thumbnail_url || film.cover_url;

  return (
    <Link
      to="/films/$slug"
      params={{ slug: film.slug }}
      preload="intent"
      className="group block w-[56vw] shrink-0 snap-start sm:w-[260px] md:w-[300px] lg:w-[340px]"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/8 transition-transform duration-300 md:group-hover:scale-[1.02]">
        {railImg ? (
          <img
            src={railImg}
            alt=""
            width={680}
            height={383}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="(min-width: 1024px) 340px, (min-width: 768px) 300px, (min-width: 640px) 260px, 56vw"
            className="cine-img absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: film.poster_gradient || fallbackGradient(film.id) }}
            aria-hidden
          />
        )}
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
  const rtl = locale === "fa";
  // In RTL, "next" (forward in reading order) means scrolling visually to the
  // left. Browsers normalize RTL scrollLeft so a positive value still moves
  // toward the end of the content — keep the same sign for both directions.
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (films.length === 0) return null;

  // Arrow glyphs: in LTR prev=‹ next=›; in RTL prev=› next=‹ so they point
  // toward the start/end of the reading direction.
  const prevPath = rtl ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6";
  const nextPath = rtl ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  const prevLabel = rtl ? "قبلی" : "Previous";
  const nextLabel = rtl ? "بعدی" : "Next";

  const headline = title || eyebrow || "";
  const seeAllLabel = rtl ? "مشاهده همه" : "See all";

  return (
    <section
      className="relative mx-auto max-w-[1400px] px-5 md:px-12 [content-visibility:auto] [contain-intrinsic-size:1px_520px]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span className="h-6 w-[3px] shrink-0 rounded-full bg-amber" aria-hidden />
          <h2 className="truncate font-display text-[18px] font-semibold tracking-[-0.01em] text-cream-bright md:text-[22px]">
            {headline}
          </h2>
          <Link
            to="/browse"
            className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-amber transition-opacity hover:opacity-75 sm:inline"
          >
            {seeAllLabel}
          </Link>
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={prevLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/60 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={prevPath} /></svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={nextLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/10 text-cream/60 transition-all hover:border-amber/40 hover:text-amber hover:bg-amber/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={nextPath} /></svg>
          </button>
        </div>
      </div>
      {subtitle && (
        <p className="mb-4 -mt-2 text-[13px] text-cream/45">{subtitle}</p>
      )}
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
  const { data: railsData } = useSuspenseQuery(homeRailsQueryOptions);
  const films = railsData.films;
  const categories = railsData.categories;

  const rails = useMemo(() => {
    const all = films ?? [];
    if (all.length === 0) return [] as Array<{ key: string; eyebrow?: string; title: string; subtitle?: string; films: Film[] }>;

    const newReleases = all.slice(0, 12);

    // Category rails — one per category that has ≥1 published film
    const byCat = new Map<string, Film[]>();
    for (const f of all) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    const catRails = (categories ?? [])
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 1)
      .map((c) => ({
        key: `cat-${c.id}`,
        eyebrow: locale === "fa" ? "مجموعه" : "Collection",
        title: t({ en: c.name_en, fa: c.name_fa || c.name_en }) || c.name_en,
        films: byCat.get(c.id) ?? [],
      }));

    const out: Array<{ key: string; eyebrow?: string; title: string; subtitle?: string; films: Film[] }> = [];

    out.push({
      key: "new",
      eyebrow: locale === "fa" ? "آثار تازه" : "New Releases",
      title: "",
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
