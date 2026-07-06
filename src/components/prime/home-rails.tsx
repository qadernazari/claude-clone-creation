import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "../../lib/i18n";
import { homeRailsQueryOptions } from "../../lib/home.functions";
import { TopTenRow } from "./top-ten-row";
import { HoverExpandRow } from "./hover-row";

/**
 * Top-of-fold below-hero content on the homepage:
 *   1. Top 10 numbered row
 *   2. One hover-expand highlight row (Iranian Originals)
 *   3. New Releases hover-expand row
 *   4. Category rails (any category with ≥3 films)
 * All rails share the same rails query, so this is one round-trip.
 */
export function HomeRails() {
  const { locale, t } = useLocale();
  const { data } = useSuspenseQuery(homeRailsQueryOptions);
  const films = data.films;
  const categories = data.categories;

  const { top10, originals, newReleases, catRails } = useMemo(() => {
    const all = films ?? [];
    const top10 = all.slice(0, 10);
    const originals = [...all]
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .slice(0, 14);
    const newReleases = all.slice(0, 14);

    const byCat = new Map<string, typeof all>();
    for (const f of all) {
      if (!f.category) continue;
      const arr = byCat.get(f.category) ?? [];
      arr.push(f);
      byCat.set(f.category, arr);
    }
    const catRails = (categories ?? [])
      .filter((c) => (byCat.get(c.id)?.length ?? 0) >= 3)
      .slice(0, 3)
      .map((c) => ({
        key: c.id,
        title: t({ en: c.name_en, fa: c.name_fa || c.name_en }) || c.name_en,
        films: byCat.get(c.id) ?? [],
      }));

    return { top10, originals, newReleases, catRails };
  }, [films, categories, t]);

  if (!films || films.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-12">
        <p className="font-display text-xl text-cream-bright">
          {locale === "fa" ? "به‌زودی، اولین آثار" : "First films, coming soon"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 pt-10 md:space-y-16 md:pb-28 md:pt-14">
      <TopTenRow
        films={top10}
        title={locale === "fa" ? "برترین‌های ایران" : "Top 10 in Iran"}
      />
      {originals.length > 0 && (
        <HoverExpandRow
          films={originals}
          eyebrow={locale === "fa" ? "آثار اختصاصی" : "Iranian Originals"}
          title=""
        />
      )}
      {newReleases.length > 0 && (
        <HoverExpandRow
          films={newReleases}
          eyebrow={locale === "fa" ? "آثار تازه" : "New Releases"}
          title=""
        />
      )}
      {catRails.map((r) => (
        <HoverExpandRow
          key={r.key}
          films={r.films}
          eyebrow={locale === "fa" ? "مجموعه" : "Collection"}
          title={r.title}
        />
      ))}
    </div>
  );
}
