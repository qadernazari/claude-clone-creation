import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "../lib/i18n";
import { homeRailsQueryOptions, type HomeRailFilm } from "../lib/home.functions";
import { LazyRail } from "./film-rail";

type Film = HomeRailFilm;

/* ---------- Multi-rail container (categories other than New Release / Walking Tour) ---------- */
export function FilmsRow() {
  const { locale, year, t } = useLocale();
  const { data: railsData } = useSuspenseQuery(homeRailsQueryOptions);
  const films = railsData.films;
  const categories = railsData.categories;

  const rails = useMemo(() => {
    const all = films ?? [];
    if (all.length === 0) return [] as Array<{ key: string; eyebrow?: string; title: string; films: Film[] }>;

    const byCat = new Map<string, Film[]>();
    for (const f of all) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    return (categories ?? [])
      // walking-tour has its own dedicated (separately chunked) component.
      .filter((c) => c.id !== "walking-tour")
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 1)
      .map((c) => ({
        key: `cat-${c.id}`,
        eyebrow: locale === "fa" ? "مجموعه" : "Collection",
        title: t({ en: c.name_en, fa: c.name_fa || c.name_en }) || c.name_en,
        films: byCat.get(c.id) ?? [],
      }));
  }, [films, categories, locale, t]);

  if (rails.length === 0) return null;

  return (
    <div className="space-y-14 md:space-y-16">
      {rails.map((r) => (
        <LazyRail
          key={r.key}
          eyebrow={r.eyebrow}
          title={r.title}
          films={r.films}
          locale={locale}
          year={year}
        />
      ))}
    </div>
  );
}
