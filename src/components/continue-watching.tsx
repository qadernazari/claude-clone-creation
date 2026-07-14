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
        .gt("position_seconds", 5)
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
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-5 md:px-12">
        <div className="mb-5 md:mb-7">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.02em] text-cream-bright md:text-[26px]">
            {fa ? "ادامه تماشا" : "Continue Watching"}
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
              <div
                className="relative aspect-video overflow-hidden rounded-xl bg-bg-1 transition-transform duration-300 md:group-hover:scale-[1.02]"
                style={{ boxShadow: "inset 0 0 0 1px rgba(var(--rgb-cream), 0.10)" }}
              >
                {f.thumbnail_url || f.cover_url ? (
                  <img
                    src={f.thumbnail_url || f.cover_url || ""}
                    alt={title}
                    width={800}
                    height={450}
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
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/80 via-bg-0/10 to-transparent" />
                {/* Hover Resume pill — slides up from bottom on desktop hover */}
                <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center md:flex">
                  <span className="inline-flex translate-y-3 items-center gap-1.5 rounded-md bg-cream-bright px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink opacity-0 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {fa ? "ادامه" : "Resume"}
                  </span>
                </div>
                {/* Mobile play affordance (always visible, subtle) */}
                <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-bg-0/60 text-cream-bright backdrop-blur-sm md:hidden">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                {/* Progress bar — amber fill, the only place gold appears */}
                <div
                  className="absolute inset-x-0 bottom-0 h-[3px]"
                  style={{ background: "rgba(var(--rgb-cream), 0.10)" }}
                >
                  <div
                    className="h-full bg-amber"
                    style={{ width: `${pct}%`, boxShadow: "0 0 8px rgba(201,168,76,0.6)" }}
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
                      ? `${num(remaining)} دقیقه مانده`
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
