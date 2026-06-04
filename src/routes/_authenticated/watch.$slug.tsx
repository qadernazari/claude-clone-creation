import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { AuthMenu } from "@/components/auth-menu";
import { useSubscription, memberCanAccess } from "@/hooks/use-subscription";
import { getFilmStreamUrl } from "@/lib/watch.functions";
import { upsertWatchProgress, getResumePosition } from "@/lib/library.functions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/watch/$slug")({
  loader: async ({ params }) => {
    const { data: film, error } = await supabase
      .from("films")
      .select(
        "id, slug, title_en, title_fa, director_en, director_fa, synopsis_en, synopsis_fa, visibility, ticket_hours, poster_gradient, cover_url, duration_min, year, access_type, is_premium"
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!film || film.visibility !== "published") throw notFound();
    return { film };
  },
  component: WatchPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    console.error("watch.$slug error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
          <button
            onClick={() => { reset(); router.invalidate(); }}
            className="text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { slug } = Route.useParams();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl">Film not found</h1>
          <p className="mt-2 text-sm text-cream/60">/{slug}</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">Back to home</Link>
        </div>
      </div>
    );
  },
});

const fallbackGradient = "linear-gradient(135deg, oklch(0.25 0.05 270), oklch(0.18 0.03 240))";

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { h, m };
}

function WatchPage() {
  const { film } = Route.useLoaderData();
  const { locale, num, dir } = useLocale();
  const fa = locale === "fa";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [theater, setTheater] = useState(true);

  const { isMember } = useSubscription();
  const accessType = (film as { access_type?: string }).access_type ?? "membership";
  const memberAllowed = isMember && memberCanAccess(accessType as never);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", film.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, expires_at")
        .eq("film_id", film.id)
        .eq("status", "paid")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    refetchInterval: 60_000,
  });

  const hasAccess = !!ticket || memberAllowed || accessType === "free";
  const isLoading = ticketLoading && !memberAllowed && accessType !== "free";

  const fetchStreamUrl = useServerFn(getFilmStreamUrl);
  const { data: streamRes } = useQuery({
    queryKey: ["stream-url", film.slug, ticket?.id ?? (memberAllowed ? "member" : "none")],
    queryFn: () => fetchStreamUrl({ data: { slug: film.slug } }),
    enabled: hasAccess,
    staleTime: 5 * 60_000,
  });
  const videoUrl =
    streamRes && "videoUrl" in streamRes ? streamRes.videoUrl : null;

  const countdown = useCountdown(ticket?.expires_at);

  // Log a play event once when access is established
  useEffect(() => {
    if (hasAccess) {
      supabase.from("events").insert({ type: "play", film_id: film.id }).then(() => {});
    }
  }, [hasAccess, film.id]);

  // Resume position: fetch from DB on mount, sync up every ~10s
  const saveProgress = useServerFn(upsertWatchProgress);
  const fetchResume = useServerFn(getResumePosition);
  const lastSyncRef = useRef<number>(0);
  const resumePosRef = useRef<number>(0);
  const resumedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasAccess) return;
    fetchResume({ data: { filmId: film.id } })
      .then((r) => {
        if (!r.completed && r.positionSeconds > 10) resumePosRef.current = r.positionSeconds;
      })
      .catch(() => {});
  }, [hasAccess, film.id, fetchResume]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const saved = resumePosRef.current;
    if (saved > 5 && saved < (v.duration || 0) - 10 && !resumedRef.current) {
      v.currentTime = saved;
      resumedRef.current = true;
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 10_000) return;
    lastSyncRef.current = now;
    const pos = Math.floor(v.currentTime);
    const dur = v.duration && isFinite(v.duration) ? Math.floor(v.duration) : null;
    saveProgress({
      data: {
        filmId: film.id,
        positionSeconds: pos,
        durationSeconds: dur,
        completed: false,
      },
    }).catch(() => {});
  }, [film.id, saveProgress]);

  const onEnded = useCallback(() => {
    const v = videoRef.current;
    const dur = v?.duration && isFinite(v.duration) ? Math.floor(v.duration) : null;
    saveProgress({
      data: {
        filmId: film.id,
        positionSeconds: dur ?? 0,
        durationSeconds: dur,
        completed: true,
      },
    }).catch(() => {});
  }, [film.id, saveProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasAccess || !videoUrl) return;
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (v.paused) v.play(); else v.pause();
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else v.requestFullscreen?.();
          break;
        case "m":
          e.preventDefault();
          v.muted = !v.muted;
          break;
        case "ArrowRight":
          e.preventDefault();
          v.currentTime = Math.min((v.duration || 0), v.currentTime + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "t":
          e.preventDefault();
          setTheater((x) => !x);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasAccess, videoUrl]);

  const title = fa ? film.title_fa || film.title_en : film.title_en;
  const director = fa ? film.director_fa || film.director_en : film.director_en;
  const synopsis = fa ? film.synopsis_fa || film.synopsis_en : film.synopsis_en;

  const posterStyle = useMemo(
    () => ({ background: (film.poster_gradient as string) || fallbackGradient }),
    [film.poster_gradient]
  );

  const t = {
    back: fa ? "بازگشت به فیلم" : "Back to film",
    noTicket: fa ? "بلیط فعالی برای این فیلم ندارید." : "You don't have an active ticket.",
    noTicketSub: fa
      ? "برای تماشای این اثر بلیط تهیه کنید."
      : "Purchase a ticket to start streaming this film.",
    buyOne: fa ? "خرید بلیط" : "Buy a ticket",
    missing: fa ? "ویدئو هنوز در دسترس نیست." : "Video is not available yet.",
    checking: fa ? "در حال بررسی بلیط…" : "Checking your ticket…",
    accessRemaining: fa ? "زمان باقی‌مانده" : "Access remaining",
    theaterOn: fa ? "حالت سینما" : "Theater mode",
    theaterOff: fa ? "حالت عادی" : "Standard view",
    shortcuts: fa ? "میانبرها" : "Shortcuts",
    aboutFilm: fa ? "درباره فیلم" : "About the film",
  };

  const showPlayer = !isLoading && !!ticket && !!videoUrl;

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-cream/10 bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={32} />
          </Link>
          <div className="flex items-center gap-4">
            {countdown && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[11px] uppercase tracking-widest text-cream/70">
                <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
                {t.accessRemaining}: {num(countdown.h)}h {num(countdown.m)}m
              </span>
            )}
            <AuthMenu />
          </div>
        </div>
      </header>

      <main className={theater ? "mx-auto max-w-[1400px] px-4 py-6" : "mx-auto max-w-5xl px-6 py-8"}>
        <div className="flex items-center justify-between">
          <Link
            to="/films/$slug"
            params={{ slug: film.slug }}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-cream/55 hover:text-cream-bright transition-colors"
          >
            ← {t.back}
          </Link>
          <button
            type="button"
            onClick={() => setTheater((x) => !x)}
            className="text-xs uppercase tracking-widest text-cream/55 hover:text-cream-bright transition-colors"
            aria-pressed={theater}
          >
            {theater ? t.theaterOff : t.theaterOn}{" "}
            <kbd className="ms-1 rounded border border-cream/20 px-1 text-[10px] text-cream/50">T</kbd>
          </button>
        </div>

        <div
          className="mt-4 relative overflow-hidden rounded-xl border border-cream/10 shadow-2xl shadow-black/60 aspect-video"
          style={!showPlayer ? posterStyle : { background: "#000" }}
        >
          {/* subtle vignette for poster states */}
          {!showPlayer && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
          )}

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-cream/70">
                <span className="h-2 w-2 rounded-full bg-cream/60 animate-pulse" />
                {t.checking}
              </div>
            </div>
          ) : !ticket ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="max-w-sm">
                <p className="font-display text-xl text-cream-bright">{t.noTicket}</p>
                <p className="mt-2 text-sm text-cream/70">{t.noTicketSub}</p>
              </div>
              <Link
                to="/films/$slug"
                params={{ slug: film.slug }}
                className="rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 transition-colors"
              >
                {t.buyOne}
              </Link>
            </div>
          ) : !videoUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-cream/70">
              {t.missing}
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={film.cover_url || undefined}
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              className="absolute inset-0 h-full w-full bg-black"
            />
          )}
        </div>

        {/* Title block */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <h1 className={`text-2xl md:text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {title}
            </h1>
            <p className="mt-1 text-sm text-cream/60">
              {director && <>{fa ? "کارگردان: " : "Directed by "}{director}</>}
              {film.year ? <> · {num(film.year)}</> : null}
              {film.duration_min ? <> · {num(film.duration_min)} {fa ? "دقیقه" : "min"}</> : null}
            </p>
          </div>

          {countdown && (
            <div className="rounded-lg border border-cream/10 bg-cream/[0.03] px-4 py-3 text-xs text-cream/70 sm:hidden">
              <div className="uppercase tracking-widest text-[10px] text-cream/45">{t.accessRemaining}</div>
              <div className="mt-0.5 text-cream-bright">{num(countdown.h)}h {num(countdown.m)}m</div>
            </div>
          )}
        </div>

        {/* About + shortcuts */}
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {synopsis && (
            <section className="md:col-span-2">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-cream/45">{t.aboutFilm}</h2>
              <p className={`mt-3 text-sm leading-relaxed text-cream/80 ${fa ? "font-vazir" : ""}`}>
                {synopsis}
              </p>
            </section>
          )}

          <section className={synopsis ? "" : "md:col-span-3"}>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-cream/45">{t.shortcuts}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-cream/70">
              {[
                { k: "Space / K", v: fa ? "پخش/مکث" : "Play / Pause" },
                { k: "←  →", v: fa ? "۵ ثانیه" : "Seek 5s" },
                { k: "F", v: fa ? "تمام‌صفحه" : "Fullscreen" },
                { k: "M", v: fa ? "بی‌صدا" : "Mute" },
                { k: "T", v: fa ? "حالت سینما" : "Theater" },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <kbd className="rounded border border-cream/15 bg-cream/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-cream/80">
                    {k}
                  </kbd>
                  <span className="text-end">{v}</span>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
