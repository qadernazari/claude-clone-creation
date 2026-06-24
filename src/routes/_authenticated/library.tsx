import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getLibrary, toggleWatchlist, type LibraryFilm, type LibraryData } from "@/lib/library.functions";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    console.error("library error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">Something went wrong loading your library.</p>
          <button onClick={() => { reset(); router.invalidate(); }} className="text-sm underline">Retry</button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <p className="text-sm">Not found</p>
    </div>
  ),
});

const fallbackGradient = "linear-gradient(135deg, oklch(0.25 0.05 270), oklch(0.18 0.03 240))";

type TabKey = "continue" | "watchlist" | "purchased" | "history" | "expired";

function LibraryPage() {
  const { locale, num, dir } = useLocale();
  const fa = locale === "fa";
  const { isMember } = useSubscription();
  const fetchLibrary = useServerFn(getLibrary);
  const [tab, setTab] = useState<TabKey>("continue");

  const { data, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => fetchLibrary(),
    staleTime: 30_000,
  });

  const lib: LibraryData = data ?? {
    continueWatching: [],
    watchlist: [],
    history: [],
    activeTickets: [],
    expiredTickets: [],
  };

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "continue", label: fa ? "ادامه تماشا" : "Continue watching", count: lib.continueWatching.length },
    { key: "watchlist", label: fa ? "فهرست تماشا" : "Watchlist", count: lib.watchlist.length },
    { key: "purchased", label: fa ? "خریداری‌شده" : "Purchased", count: lib.activeTickets.length },
    { key: "history", label: fa ? "تاریخچه" : "History", count: lib.history.length },
    { key: "expired", label: fa ? "منقضی" : "Expired", count: lib.expiredTickets.length },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pt-20 pb-20 md:px-6 md:pt-28">
        <header className="flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cream/45">
            {fa ? "حساب من" : "My account"}
          </p>
          <h1 className={`text-4xl md:text-5xl tracking-[-0.03em] text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {fa ? "کتابخانه من" : "My Library"}
          </h1>
          <p className="mt-2 text-sm text-cream/60 max-w-xl">
            {fa
              ? "هرچه دیده‌اید، ذخیره کرده‌اید یا خریده‌اید، در یک نمای آرام."
              : "Everything you're watching, saved, or have purchased — in one calm place."}
          </p>
          {isMember && (
            <div
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-md px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
              style={{
                border: "1px solid rgba(var(--rgb-amber), 0.30)",
                background: "rgba(var(--rgb-amber), 0.10)",
                color: "rgb(var(--rgb-amber-bright))",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "rgb(var(--rgb-amber))" }}
              />
              {fa ? "عضو فعال" : "Active member"}
            </div>
          )}
        </header>

        {/* Tabs */}
        <nav className="no-scrollbar mt-8 -mx-5 flex gap-1 overflow-x-auto border-b border-cream/10 px-5 md:mt-10 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-[11px] uppercase tracking-[0.18em] transition-colors md:px-4 md:text-xs ${
                  active ? "text-cream-bright" : "text-cream/50 hover:text-cream/85"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className="ml-2 rtl:ml-0 rtl:mr-2 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  {num(t.count)}
                </span>
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-amber" />
                )}
              </button>
            );
          })}
        </nav>

        <section className="mt-10">
          {isLoading ? (
            <SkeletonGrid />
          ) : tab === "continue" ? (
            lib.continueWatching.length === 0 ? (
              <Empty
                title={fa ? "هنوز چیزی شروع نکرده‌اید." : "Nothing in progress yet."}
                cta={fa ? "مرور آثار" : "Browse films"}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {lib.continueWatching.map((r) => (
                  <ContinueCard
                    key={r.film.id}
                    film={r.film}
                    position={r.position_seconds}
                    duration={r.duration_seconds ?? (r.film.duration_min ?? 0) * 60}
                  />
                ))}
              </div>
            )
          ) : tab === "watchlist" ? (
            lib.watchlist.length === 0 ? (
              <Empty
                title={fa ? "فهرست تماشای شما خالی است." : "Your watchlist is empty."}
                cta={fa ? "کشف فیلم‌ها" : "Discover films"}
              />
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {lib.watchlist.map((r) => (
                  <WatchlistCard key={r.film.id} film={r.film} />
                ))}
              </div>
            )
          ) : tab === "purchased" ? (
            lib.activeTickets.length === 0 ? (
              <Empty
                title={fa ? "بلیط فعالی ندارید." : "No active rentals or purchases."}
                cta={fa ? "مرور آثار ویژه" : "Browse premium releases"}
              />
            ) : (
              <ul className="space-y-3">
                {lib.activeTickets.map((tk) => (
                  <TicketRow
                    key={tk.id}
                    film={tk.film}
                    expiresAt={tk.expires_at}
                    paidAt={tk.paid_at}
                    active
                  />
                ))}
              </ul>
            )
          ) : tab === "history" ? (
            lib.history.length === 0 ? (
              <Empty title={fa ? "تاریخچه‌ای موجود نیست." : "No watch history yet."} />
            ) : (
              <ul className="space-y-2">
                {lib.history.map((r) => (
                  <li
                    key={r.film.id}
                    className="hairline flex items-center gap-4 rounded-xl border bg-bg-1/50 p-3"
                  >
                    <PosterThumb film={r.film} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/films/$slug"
                        params={{ slug: r.film.slug }}
                        className={`block truncate text-cream-bright hover:text-amber transition-colors ${fa ? "font-vazir" : "font-display"}`}
                      >
                        {fa ? r.film.title_fa || r.film.title_en : r.film.title_en}
                      </Link>
                      <div className="mt-1 text-[11px] text-cream/55">
                        {r.completed
                          ? fa ? "تماشا تمام شد" : "Completed"
                          : `${Math.round((r.position_seconds / Math.max(1, (r.duration_seconds ?? (r.film.duration_min ?? 1) * 60))) * 100)}%`}
                        {" · "}
                        {new Date(r.last_watched_at).toLocaleDateString(fa ? "fa-IR" : "en-US")}
                      </div>
                    </div>
                    <Link
                      to="/watch/$slug"
                      params={{ slug: r.film.slug }}
                      className="rounded-md border border-cream/20 px-3 py-1.5 text-xs text-cream/80 hover:border-cream/40 hover:text-cream-bright"
                    >
                      {r.completed ? (fa ? "تماشای دوباره" : "Rewatch") : (fa ? "ادامه" : "Resume")}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : (
            lib.expiredTickets.length === 0 ? (
              <Empty title={fa ? "بلیط منقضی‌ای ندارید." : "No expired tickets."} />
            ) : (
              <ul className="space-y-3">
                {lib.expiredTickets.map((tk) => (
                  <TicketRow
                    key={tk.id}
                    film={tk.film}
                    expiresAt={tk.expires_at}
                    paidAt={tk.paid_at}
                    active={false}
                  />
                ))}
              </ul>
            )
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PosterThumb({ film, size = "md" }: { film: LibraryFilm; size?: "sm" | "md" }) {
  const fallback = (film.poster_gradient as string) || fallbackGradient;
  const cls = size === "sm" ? "h-16 w-12" : "aspect-[2/3] w-full";
  return (
    <div
      aria-hidden
      style={{ background: fallback }}
      className={`relative overflow-hidden rounded-md bg-bg-1 ring-1 ring-cream/10 ${cls}`}
    >
      {film.cover_url && (
        <img
          src={film.cover_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function FilmCard({ film }: { film: LibraryFilm }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  return (
    <Link
      to="/films/$slug"
      params={{ slug: film.slug }}
      className="group block"
    >
      <div className="relative">
        <PosterThumb film={film} />
        {film.is_premium && (
          <span className="absolute left-2 top-2 inline-flex rounded-md bg-amber/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-bg-0">
            {fa ? "ویژه" : "Premium"}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`line-clamp-1 text-sm text-cream-bright group-hover:text-amber transition-colors ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? film.title_fa || film.title_en : film.title_en}
        </p>
        {(fa ? film.director_fa || film.director_en : film.director_en) && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-cream/50">
            {fa ? film.director_fa || film.director_en : film.director_en}
          </p>
        )}
      </div>
    </Link>
  );
}

function WatchlistCard({ film }: { film: LibraryFilm }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const queryClient = useQueryClient();
  const removeFromList = useServerFn(toggleWatchlist);
  const [pending, setPending] = useState(false);

  async function onRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await removeFromList({ data: { filmId: film.id, add: false } });
      toast.success(fa ? "از فهرست حذف شد" : "Removed from watchlist");
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : fa ? "خطا در حذف" : "Couldn't remove from watchlist",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={fa ? "حذف از فهرست" : "Remove from watchlist"}
        title={fa ? "حذف از فهرست" : "Remove from watchlist"}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-bg-0/80 text-cream/70 border border-cream/15 backdrop-blur opacity-0 group-hover:opacity-100 hover:text-cream-bright hover:border-cream/40 transition-all disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <FilmCard film={film} />
    </div>
  );
}

function ContinueCard({
  film,
  position,
  duration,
}: {
  film: LibraryFilm;
  position: number;
  duration: number;
}) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const pct = duration > 0 ? Math.min(100, Math.max(2, (position / duration) * 100)) : 5;
  return (
    <Link to="/watch/$slug" params={{ slug: film.slug }} className="group block">
      <div
        aria-hidden
        style={{ background: (film.poster_gradient as string) || fallbackGradient }}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-bg-1 ring-1 ring-cream/10"
      >
        {(film.thumbnail_url || film.cover_url) && (
          <img
            src={film.thumbnail_url || film.cover_url || ""}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/60 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
          <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-bg-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>
      <div className="mt-3">
        <p className={`line-clamp-1 text-sm text-cream-bright group-hover:text-amber transition-colors ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? film.title_fa || film.title_en : film.title_en}
        </p>
        <p className="mt-0.5 text-[11px] text-cream/50">
          {fa ? "ادامه از" : "Resume from"} {formatTime(position, fa)}
        </p>
      </div>
    </Link>
  );
}

function TicketRow({
  film,
  expiresAt,
  paidAt,
  active,
}: {
  film: LibraryFilm;
  expiresAt: string;
  paidAt: string | null;
  active: boolean;
}) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  return (
    <li className="hairline grid grid-cols-[64px_1fr_auto] items-center gap-4 rounded-xl border bg-bg-1/50 p-4">
      <PosterThumb film={film} size="sm" />
      <div className="min-w-0">
        <Link
          to="/films/$slug"
          params={{ slug: film.slug }}
          className={`block truncate text-cream-bright hover:text-amber transition-colors ${fa ? "font-vazir" : "font-display"}`}
        >
          {fa ? film.title_fa || film.title_en : film.title_en}
        </Link>
        <p className="mt-1 text-[11px] text-cream/55">
          {paidAt && <>{fa ? "خرید" : "Purchased"} {new Date(paidAt).toLocaleDateString(fa ? "fa-IR" : "en-US")} · </>}
          {active
            ? <>{fa ? "تا" : "Access until"} {new Date(expiresAt).toLocaleString(fa ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</>
            : <>{fa ? "منقضی شده" : "Expired"} {new Date(expiresAt).toLocaleDateString(fa ? "fa-IR" : "en-US")}</>}
        </p>
      </div>
      {active ? (
        <Link
          to="/watch/$slug"
          params={{ slug: film.slug }}
          className="rounded-md bg-amber px-4 py-2 text-xs font-medium text-bg-0 hover:bg-amber/90"
        >
          {fa ? "تماشا" : "Watch"}
        </Link>
      ) : (
        <Link
          to="/films/$slug"
          params={{ slug: film.slug }}
          className="rounded-md border border-cream/20 px-4 py-2 text-xs text-cream/80 hover:border-cream/40 hover:text-cream-bright"
        >
          {fa ? "خرید دوباره" : "Buy again"}
        </Link>
      )}
    </li>
  );
}

function Empty({ title, cta }: { title: string; cta?: string }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <div
        className="mb-6 flex items-center justify-center rounded-full text-amber"
        style={{
          width: "64px",
          height: "64px",
          border: "1px solid rgba(var(--rgb-amber), 0.30)",
          background: "rgba(var(--rgb-amber), 0.06)",
        }}
        aria-hidden
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h14a1 1 0 0 1 1 1v15l-8-4-8 4V5a1 1 0 0 1 1-1Z" />
        </svg>
      </div>
      <span
        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em]"
        style={{ color: "rgba(var(--rgb-amber), 0.9)" }}
      >
        {fa ? "کتابخانه" : "Library"}
      </span>
      <h3 className={`font-display text-xl font-medium tracking-[-0.01em] text-cream-bright md:text-2xl ${fa ? "font-vazir" : ""}`}>
        {title}
      </h3>
      <div
        className="mx-auto mt-5 h-px w-12"
        style={{ background: "rgba(var(--rgb-amber), 0.40)" }}
        aria-hidden
      />
      {cta ? (
        <Link
          to="/browse"
          className="mt-7 inline-flex min-h-11 items-center rounded-md bg-amber px-6 py-3 text-[13px] font-semibold text-bg-0 transition-all duration-300 hover:bg-amber/90 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(201,168,76,0.4)] active:scale-[0.98]"
        >
          {cta}
        </Link>
      ) : (
        <p className="mt-5 text-xs text-cream/45">
          {fa ? "وقتی شروع به تماشا کنید اینجا ظاهر می‌شود." : "It'll appear here once you start watching."}
        </p>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[2/3] w-full rounded-md bg-cream/4 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-cream/4 animate-pulse" />
          <div className="h-2 w-1/2 rounded bg-cream/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function formatTime(seconds: number, fa: boolean): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const str = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  if (!fa) return str;
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
