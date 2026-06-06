import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "../integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-subscription";
import { useLocale } from "../lib/i18n";

type Row = {
  film_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  last_watched_at: string;
  films: {
    id: string;
    slug: string;
    title_en: string;
    title_fa: string | null;
    cover_url: string | null;
    thumbnail_url: string | null;
    poster_gradient: string | null;
    duration_min: number | null;
  } | null;
};

function fallbackGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = 40 + (Math.abs(h) % 40);
  const b = 60 + (Math.abs(h >> 4) % 40);
  return `linear-gradient(135deg, oklch(0.32 0.05 ${a}) 0%, oklch(0.45 0.10 ${b}) 100%)`;
}

export function ContinueWatching() {
  const user = useCurrentUser();
  const { locale, t, num } = useLocale();
  const fa = locale === "fa";

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["continue-watching", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_progress")
        .select(
          "film_id, position_seconds, duration_seconds, last_watched_at, films!inner(id, slug, title_en, title_fa, cover_url, thumbnail_url, poster_gradient, duration_min)",
        )
        .eq("user_id", user!.id)
        .eq("completed", false)
        .gt("position_seconds", 15)
        .order("last_watched_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
    staleTime: 30_000,
  });

  if (!user) return null;
  if (isLoading) {
    return (
      <section className="relative">
        <div className="mx-auto max-w-[1400px] px-5 md:px-12">
          <div className="mb-5 md:mb-7">
            <span className="block h-3 w-32 animate-pulse rounded-sm bg-cream/10" />
          </div>
        </div>
        <div className="no-scrollbar flex gap-4 overflow-x-hidden px-5 pb-2 md:gap-6 md:px-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-video w-[78vw] shrink-0 animate-pulse rounded-xl bg-cream/4 ring-1 ring-cream/5 sm:w-[360px] md:w-[400px]"
            />
          ))}
        </div>
      </section>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <section className="relative" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 320px" }}>
      <div className="mx-auto max-w-[1400px] px-5 md:px-12">
        <div className="mb-5 md:mb-7">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[26px]">
            {fa ? "ادامه‌ی تماشا" : "Continue Watching"}
          </h2>
        </div>
      </div>
      <div
        className="no-scrollbar flex snap-x gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 md:snap-mandatory md:gap-6 md:px-12"
        style={{ scrollPaddingLeft: "1.25rem", WebkitOverflowScrolling: "touch" as never }}
      >
        {data.map((row) => {
          if (!row.films) return null;
          const f = row.films;
          const title = t({ en: f.title_en, fa: f.title_fa || f.title_en });
          const totalSec =
            row.duration_seconds ?? (f.duration_min ? f.duration_min * 60 : null);
          const pct = totalSec
            ? Math.min(100, Math.max(2, (row.position_seconds / totalSec) * 100))
            : 8;
          const remaining = totalSec
            ? Math.max(0, Math.round((totalSec - row.position_seconds) / 60))
            : null;

          return (
            <Link
              key={row.film_id}
              to="/watch/$slug"
              params={{ slug: f.slug }}
              className="group block w-[78vw] shrink-0 snap-start sm:w-[360px] md:w-[400px]"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover:-translate-y-1 group-hover:ring-cream/20">
                {f.thumbnail_url || f.cover_url ? (
                  <img
                    src={f.thumbnail_url || f.cover_url || ""}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="cine-img absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: f.poster_gradient || fallbackGradient(f.id) }}
                    aria-hidden
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/70 via-transparent to-transparent" />
                {/* play affordance */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream-bright/95 text-ink shadow-2xl">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                {/* progress bar — only place gold appears as a fill */}
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-cream/10">
                  <div
                    className="h-full bg-amber"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="mt-3.5 px-0.5">
                <h3 className="font-display text-[14px] font-medium tracking-[-0.01em] text-cream-bright line-clamp-1">
                  {title}
                </h3>
                {remaining !== null && (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-cream/40">
                    {fa
                      ? `${num(remaining)} دقیقه باقی‌مانده`
                      : `${num(remaining)} min left`}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
        <div className="w-4 shrink-0 md:w-8" aria-hidden />
      </div>
    </section>
  );
}
