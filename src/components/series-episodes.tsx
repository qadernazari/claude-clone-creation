import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import { episodesQueryOptions, type EpisodeSummary } from "@/lib/episodes.functions";

export function SeriesEpisodes({ seriesId }: { seriesId: string }) {
  const { locale, t, num } = useLocale();
  const fa = locale === "fa";
  const { data: episodes = [], isLoading } = useQuery(episodesQueryOptions(seriesId));

  const seasons = useMemo(() => {
    const map = new Map<number, EpisodeSummary[]>();
    for (const ep of episodes) {
      const s = ep.season_number ?? 1;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(ep);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [episodes]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 md:py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-cream/10" />
      </section>
    );
  }

  if (episodes.length === 0) return null;

  return (
    <section
      id="episodes"
      className="mx-auto max-w-5xl border-t border-cream/10 px-5 py-12 sm:px-6 md:py-16"
    >
      <header className="mb-8">
        <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/40">
          {fa ? "قسمت‌ها" : "Episodes"}
        </span>
        <h2 className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-cream-bright md:text-4xl">
          {num(episodes.length)}{" "}
          {fa ? "قسمت" : episodes.length === 1 ? "episode" : "episodes"}
        </h2>
      </header>

      {seasons.map(([seasonNum, eps]) => (
        <div key={seasonNum} className="mb-10 last:mb-0">
          {seasons.length > 1 && (
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cream/55">
              {fa ? `فصل ${num(seasonNum)}` : `Season ${seasonNum}`}
            </h3>
          )}
          <ul className="space-y-3">
            {eps.map((ep) => (
              <li key={ep.id}>
                <Link
                  to="/films/$slug"
                  params={{ slug: ep.slug }}
                  className="group flex gap-4 rounded-2xl border border-cream/5 bg-bg-1/40 p-3 transition-colors hover:border-cream/15 hover:bg-bg-1/70 md:p-4"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-cream/5 md:w-48">
                    {ep.thumbnail_url || ep.cover_url ? (
                      <img
                        src={ep.thumbnail_url ?? ep.cover_url ?? ""}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute bottom-1.5 left-1.5 rounded bg-bg-0/80 px-1.5 py-0.5 text-[10px] font-semibold text-cream/80">
                      {fa
                        ? `ق ${num(ep.episode_number)}`
                        : `E${ep.episode_number}`}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium text-cream-bright group-hover:text-cream md:text-base">
                      {t({ en: ep.title_en, fa: ep.title_fa || ep.title_en })}
                    </h4>
                    {ep.duration_min && (
                      <p className="mt-1 text-[11px] text-cream/45">
                        {num(ep.duration_min)} {fa ? "دقیقه" : "min"}
                      </p>
                    )}
                    {(ep.synopsis_en || ep.synopsis_fa) && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cream/60 md:text-sm">
                        {t({
                          en: ep.synopsis_en ?? "",
                          fa: ep.synopsis_fa ?? ep.synopsis_en ?? "",
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
