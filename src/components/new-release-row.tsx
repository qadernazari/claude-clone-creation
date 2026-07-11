import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "../lib/i18n";
import { homeRailsQueryOptions } from "../lib/home.functions";
import { Rail } from "./film-rail";


export function NewReleaseRow() {
  const { locale, year } = useLocale();
  const { data } = useSuspenseQuery(homeRailsQueryOptions);
  const newReleases = useMemo(() => (data.films ?? []).slice(0, 12), [data.films]);

  if (newReleases.length === 0) return null;


  return (
    <Rail
      eyebrow={locale === "fa" ? "آثار تازه" : "New Releases"}
      title=""
      films={newReleases}
      locale={locale}
      year={year}
    />
  );
}
