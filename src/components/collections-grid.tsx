import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { homePageQueryOptions, type HomeCategory, type HomeRailFilm } from "../lib/home.functions";

type Category = HomeCategory;
type Film = HomeRailFilm;

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.28 0.05 ${a}) 0%, oklch(0.40 0.08 ${b}) 100%)`;
}

export function CollectionsGrid() {
  const { locale, t } = useLocale();
  const fa = locale === "fa";
  const { data: homeData } = useSuspenseQuery(homePageQueryOptions);
  const categories = homeData.categories as Category[];
  const films = homeData.films as Film[];

  const tiles = useMemo(() => {
    const byCat = new Map<string, Film[]>();
    for (const f of films) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    return categories
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 1)
      .slice(0, 6)
      .map((c) => {
        const list = byCat.get(c.id) ?? [];
        const cover = list.find((f) => f.thumbnail_url) ?? list.find((f) => f.cover_url) ?? list[0];
        const art = cover?.thumbnail_url || cover?.cover_url;
        return {
          id: c.id,
          name: t({ en: c.name_en, fa: c.name_fa || c.name_en }),
          slug: c.id,
          art,
          gradient: cover?.poster_gradient || fallbackGradient(c.id),
          count: list.length,
        };
      });
  }, [categories, films, t]);

  if (tiles.length === 0) return null;

  return (
    <section
      className="relative px-5 md:px-12"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 600px" }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-6 md:mb-6">
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40 md:mb-2.5">
              {fa ? "مجموعه‌ها" : "Collections"}
            </span>
            <h2 className="font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[26px]">
              {fa ? "مجموعه‌های منتخب" : "Curated collections"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Link
              key={tile.id}
              to="/browse"
              className="group relative block aspect-[16/10] overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/[0.06] transition-all duration-500 hover:ring-cream/20"
            >
              {tile.art ? (
                <img
                  src={tile.art}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="cine-img absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: tile.gradient }} aria-hidden />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <h3 className="font-display text-lg font-medium tracking-[-0.01em] text-cream-bright md:text-2xl">
                  {tile.name}
                </h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/55 md:text-[11px]">
                  {fa ? `${tile.count} اثر` : `${tile.count} ${tile.count === 1 ? "film" : "films"}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
