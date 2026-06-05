import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { AuthMenu } from "@/components/auth-menu";
import { useSubscription, memberCanAccess } from "@/hooks/use-subscription";
import { TrialExpiredModal } from "@/components/trial-expired-modal";
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
  const { locale, num, year, dir } = useLocale();
  const fa = locale === "fa";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [theater, setTheater] = useState(true);

  const { isMember, isTrialExpired } = useSubscription();
  const [trialModalOpen, setTrialModalOpen] = useState(false);
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

  // If the user just landed here without access AND their trial recently ended,
  // surface the upgrade modal.
  useEffect(() => {
    if (!isLoading && isTrialExpired && !memberAllowed && !ticket) {
      setTrialModalOpen(true);
    }
  }, [isLoading, isTrialExpired, memberAllowed, ticket]);

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

  // Log a play event once when access is established (with geo / device captured server-side)
  useEffect(() => {
    if (!hasAccess) return;
    let sid = "";
    try {
      sid = localStorage.getItem("ir_sid") || "";
      if (!sid) {
        sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem("ir_sid", sid);
      }
    } catch { /* ignore */ }
    import("@/lib/analytics.functions").then(({ logFilmEvent }) => {
      logFilmEvent({ data: { filmId: film.id, type: "play", sessionId: sid, referrer: document.referrer || null } }).catch(() => {});
    });
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

  const [resumePrompt, setResumePrompt] = useState<number | null>(null);
  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // Restore persisted volume
    try {
      const savedVol = parseFloat(localStorage.getItem("player:volume") ?? "");
      if (!Number.isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) v.volume = savedVol;
      const savedMuted = localStorage.getItem("player:muted");
      if (savedMuted === "1") v.muted = true;
    } catch {}
    const saved = resumePosRef.current;
    if (saved > 5 && saved < (v.duration || 0) - 10 && !resumedRef.current) {
      v.pause();
      resumedRef.current = true;
      setResumePrompt(saved);
    }
  }, []);

  const acceptResume = useCallback(() => {
    const v = videoRef.current;
    if (!v || resumePrompt === null) return;
    v.currentTime = resumePrompt;
    setResumePrompt(null);
    v.play().catch(() => {});
  }, [resumePrompt]);

  const declineResume = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setResumePrompt(null);
    v.play().catch(() => {});
  }, []);

  const fmtTime = (s: number) => {
    const sec = Math.max(0, Math.floor(s));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const r = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
      : `${m}:${String(r).padStart(2, "0")}`;
  };

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

  // Transient HUD overlay (volume / seek / playback feedback)
  const [hud, setHud] = useState<string | null>(null);
  const hudTimerRef = useRef<number | null>(null);
  const flashHud = useCallback((text: string) => {
    setHud(text);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => setHud(null), 900);
  }, []);

  // Persist volume changes
  const onVolumeChange = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      localStorage.setItem("player:volume", String(v.volume));
      localStorage.setItem("player:muted", v.muted ? "1" : "0");
    } catch {}
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasAccess || !videoUrl) return;
    const seekBy = (v: HTMLVideoElement, delta: number) => {
      v.currentTime = Math.min(v.duration || 0, Math.max(0, v.currentTime + delta));
      flashHud(`${delta > 0 ? "+" : ""}${delta}s`);
    };
    const bumpVolume = (v: HTMLVideoElement, delta: number) => {
      v.muted = false;
      v.volume = Math.min(1, Math.max(0, v.volume + delta));
      flashHud(`${fa ? "صدا" : "Volume"} ${Math.round(v.volume * 100)}%`);
    };
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      // Number keys 0-9 → jump to that decile of the video
      if (/^[0-9]$/.test(e.key) && v.duration && isFinite(v.duration)) {
        e.preventDefault();
        const pct = parseInt(e.key, 10) / 10;
        v.currentTime = v.duration * pct;
        flashHud(`${pct * 100}%`);
        return;
      }
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (v.paused) { v.play(); flashHud(fa ? "پخش" : "Play"); }
          else { v.pause(); flashHud(fa ? "مکث" : "Pause"); }
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else v.requestFullscreen?.();
          break;
        case "m":
          e.preventDefault();
          v.muted = !v.muted;
          flashHud(v.muted ? (fa ? "بی‌صدا" : "Muted") : (fa ? "صدادار" : "Unmuted"));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(v, 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(v, -5);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekBy(v, 10);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekBy(v, -10);
          break;
        case "ArrowUp":
          e.preventDefault();
          bumpVolume(v, 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          bumpVolume(v, -0.1);
          break;
        case "t":
          e.preventDefault();
          setTheater((x) => !x);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasAccess, videoUrl, fa, flashHud]);

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

  const showPlayer = !isLoading && hasAccess && !!videoUrl;

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      {trialModalOpen && <TrialExpiredModal onClose={() => setTrialModalOpen(false)} />}
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

      <main className={theater ? "mx-auto max-w-[1400px] px-0 py-0 md:px-4 md:py-6" : "mx-auto max-w-5xl px-0 py-0 md:px-6 md:py-8"}>
        <div className="hidden md:flex items-center justify-between">
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
          ) : !hasAccess ? (
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
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                poster={film.cover_url || undefined}
                controls
                autoPlay={resumePrompt === null}
                playsInline
                controlsList="nodownload"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                onVolumeChange={onVolumeChange}
                className="absolute inset-0 h-full w-full bg-black"
              />
              {resumePrompt !== null && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                  <div className="rounded-xl border border-cream/15 bg-bg-0/90 p-6 max-w-sm text-center shadow-2xl">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cream/45">
                      {fa ? "ادامه تماشا" : "Continue watching"}
                    </p>
                    <p className="mt-2 font-display text-xl text-cream-bright">
                      {fa ? "از " : "Resume from "}{fmtTime(resumePrompt)}?
                    </p>
                    <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        type="button"
                        onClick={acceptResume}
                        className="rounded-md bg-amber px-5 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90 transition-colors"
                      >
                        {fa ? "ادامه بده" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={declineResume}
                        className="rounded-md border border-cream/20 px-5 py-2 text-sm text-cream/80 hover:bg-cream/5 transition-colors"
                      >
                        {fa ? "از ابتدا" : "Start over"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {hud && (
                <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-cream/15 bg-bg-0/85 backdrop-blur px-4 py-1.5 text-xs text-cream/90 shadow-lg animate-fade-in">
                  {hud}
                </div>
              )}
            </>
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
              {film.year ? <> · {year(film.year)}</> : null}
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

          <section className={synopsis ? "hidden md:block" : "hidden md:block md:col-span-3"}>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-cream/45">{t.shortcuts}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-cream/70">
              {[
                { k: "Space / K", v: fa ? "پخش/مکث" : "Play / Pause" },
                { k: "←  →", v: fa ? "۵ ثانیه" : "Seek 5s" },
                { k: "J / L", v: fa ? "۱۰ ثانیه" : "Seek 10s" },
                { k: "↑  ↓", v: fa ? "صدا" : "Volume" },
                { k: "0–9", v: fa ? "پرش درصدی" : "Jump to %" },
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
