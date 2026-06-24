import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const currentSeason = activeSeason ?? seasons[0]?.[0] ?? 1;
  const currentEps = useMemo(
    () => seasons.find(([s]) => s === currentSeason)?.[1] ?? [],
    [seasons, currentSeason],
  );

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 md:py-16">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-cream/10" />
          <div className="h-8 w-56 animate-pulse rounded bg-cream/10" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream/5" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (episodes.length === 0) return null;

  return (
    <section
      id="episodes"
      className="mx-auto max-w-5xl border-t border-cream/10 px-5 py-12 sm:px-6 md:py-16"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.32em] text-amber/90">
            {fa ? "قسمت‌ها" : "Episodes"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-cream-bright md:text-4xl">
            {num(episodes.length)}{" "}
            {fa ? "قسمت" : episodes.length === 1 ? "episode" : "episodes"}
          </h2>
        </div>

        {/* Segmented pill season picker — amber active, hairline rest */}
        {seasons.length > 1 && (
          <div
            role="tablist"
            aria-label={fa ? "انتخاب فصل" : "Select season"}
            className="inline-flex items-center gap-1 rounded-md border border-cream/10 bg-bg-1/60 p-1 backdrop-blur"
          >
            {seasons.map(([s]) => {
              const isActive = s === currentSeason;
              return (
                <button
                  key={s}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveSeason(s)}
                  className={`relative min-w-[68px] rounded-md px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.16em] transition-all duration-300 ${
                    isActive
                      ? "bg-amber text-ink shadow-[0_4px_18px_-6px_rgba(201,168,76,0.55)]"
                      : "text-cream/55 hover:text-cream"
                  }`}
                >
                  {fa ? `فصل ${num(s)}` : `S${s}`}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <ul className="space-y-3">
        {currentEps.map((ep, idx) => {
          const isNextUp = idx === 0;
          return (
            <li key={ep.id}>
              <Link
                to="/films/$slug"
                params={{ slug: ep.slug }}
                className={`group relative flex gap-4 overflow-hidden rounded-2xl border bg-bg-1/40 p-3 transition-all duration-300 hover:bg-bg-1/80 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)] md:p-4 ${
                  isNextUp
                    ? "border-amber/30 hover:border-amber/55"
                    : "border-cream/5 hover:border-cream/20"
                }`}
              >
                <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-cream/5 md:w-52">
                  {ep.thumbnail_url || ep.cover_url ? (
                    <img
                      src={ep.thumbnail_url ?? ep.cover_url ?? ""}
                      alt=""
                      loading="lazy"
                      className="cine-img h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-cream/30">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {/* Play overlay on hover (desktop) */}
                  <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-bg-0/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-bright text-ink shadow-[0_8px_24px_-6px_rgba(0,0,0,0.7)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 rounded bg-bg-0/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cream/85 backdrop-blur-sm">
                    {fa
                      ? `ق ${num(ep.episode_number)}`
                      : `E${ep.episode_number}`}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="truncate font-display text-sm font-medium tracking-[-0.01em] text-cream-bright md:text-base">
                      {t({ en: ep.title_en, fa: ep.title_fa || ep.title_en })}
                    </h4>
                    {isNextUp && (
                      <span className="hidden shrink-0 rounded-md border border-amber/35 bg-amber/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-bright md:inline-block">
                        {fa ? "بعدی" : "Next up"}
                      </span>
                    )}
                  </div>
                  {ep.duration_min && (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-cream/45">
                      {num(ep.duration_min)} {fa ? "دقیقه" : "min"}
                    </p>
                  )}
                  {(ep.synopsis_en || ep.synopsis_fa) && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cream/65 md:text-sm">
                      {t({
                        en: ep.synopsis_en ?? "",
                        fa: ep.synopsis_fa ?? ep.synopsis_en ?? "",
                      })}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
