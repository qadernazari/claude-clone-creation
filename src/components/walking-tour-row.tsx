import { useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "../lib/i18n";
import { homeRailsQueryOptions } from "../lib/home.functions";
import { LazyRail } from "./film-rail";
import { logMount } from "@/lib/perf-log";


export function WalkingTourRow() {
  const { locale, t, year } = useLocale();
  const { data } = useSuspenseQuery(homeRailsQueryOptions);

  const { films, title } = useMemo(() => {
    const all = data.films ?? [];
    const wtFilms = all.filter((f) => f.category === "walking-tour");
    const cat = (data.categories ?? []).find((c) => c.id === "walking-tour");
    const catTitle = cat
      ? t({ en: cat.name_en, fa: cat.name_fa || cat.name_en }) || cat.name_en
      : locale === "fa"
        ? "تور پیاده"
        : "Walking Tour";
    return { films: wtFilms, title: catTitle };
  }, [data.films, data.categories, locale, t]);

  if (films.length === 0) return null;

  return (
    <LazyRail
      eyebrow={locale === "fa" ? "مجموعه" : "Collection"}
      title={title}
      films={films}
      locale={locale}
      year={year}
    />
  );
}
