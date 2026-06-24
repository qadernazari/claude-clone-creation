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
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

// Lazy — only loads if the user's trial actually expires mid-watch.
const TrialExpiredModal = lazy(() => import("@/components/trial-expired-modal").then((m) => ({ default: m.TrialExpiredModal })));

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
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("paid_at", { ascending: false, nullsFirst: false })
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
    setMuted(v.muted);
    try {
      localStorage.setItem("player:volume", String(v.volume));
      localStorage.setItem("player:muted", v.muted ? "1" : "0");
    } catch {}
  }, []);

  /* ---------- Custom player overlay state ---------- */
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const overlayTimerRef = useRef<number | null>(null);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const tapStateRef = useRef<{ t: number; x: number } | null>(null);
  const [seekRipple, setSeekRipple] = useState<{ side: "left" | "right"; key: number } | null>(null);

  const revealOverlay = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = window.setTimeout(() => {
      // Don't auto-hide while paused
      if (videoRef.current && !videoRef.current.paused) setOverlayVisible(false);
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (overlayTimerRef.current) window.clearTimeout(overlayTimerRef.current);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    revealOverlay();
  }, [revealOverlay]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    revealOverlay();
  }, [revealOverlay]);

  const toggleFullscreen = useCallback(() => {
    const shell = playerShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else shell.requestFullscreen?.().catch(() => {});
  }, []);

  const scrubToClientX = useCallback((clientX: number) => {
    const v = videoRef.current;
    const bar = scrubRef.current;
    if (!v || !bar || !v.duration || !isFinite(v.duration)) return;
    const rect = bar.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    if (dir === "rtl") pct = 1 - pct;
    pct = Math.max(0, Math.min(1, pct));
    v.currentTime = v.duration * pct;
    setCurrentTime(v.currentTime);
  }, [dir]);

  const onScrubPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setScrubbing(true);
    scrubToClientX(e.clientX);
  }, [scrubToClientX]);

  const onScrubPointerMove = useCallback((e: React.PointerEvent) => {
    if (!scrubbing) return;
    scrubToClientX(e.clientX);
  }, [scrubbing, scrubToClientX]);

  const onScrubPointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setScrubbing(false);
    revealOverlay();
  }, [revealOverlay]);

  // Double-tap left / right edge → ±10s seek (mobile)
  const onPlayerPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    const now = Date.now();
    const prev = tapStateRef.current;
    if (prev && now - prev.t < 280 && Math.abs(prev.x - e.clientX) < 40) {
      const v = videoRef.current;
      const shell = playerShellRef.current;
      if (v && shell && v.duration && isFinite(v.duration)) {
        const rect = shell.getBoundingClientRect();
        let side: "left" | "right" = e.clientX < rect.left + rect.width / 2 ? "left" : "right";
        if (dir === "rtl") side = side === "left" ? "right" : "left";
        const delta = side === "right" ? 10 : -10;
        v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + delta));
        setCurrentTime(v.currentTime);
        setSeekRipple({ side: side === "right" ? "right" : "left", key: now });
        window.setTimeout(() => setSeekRipple((r) => (r && r.key === now ? null : r)), 600);
      }
      tapStateRef.current = null;
      return;
    }
    tapStateRef.current = { t: now, x: e.clientX };
  }, [dir]);

  const onPlayEvt = useCallback(() => { setPlaying(true); revealOverlay(); }, [revealOverlay]);
  const onPauseEvt = useCallback(() => { setPlaying(false); setOverlayVisible(true); }, []);
  const onDurationChangeEvt = useCallback(() => {
    const v = videoRef.current;
    if (v && isFinite(v.duration)) setDuration(v.duration);
  }, []);
  const onProgressEvt = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.buffered.length === 0) return;
    setBuffered(v.buffered.end(v.buffered.length - 1));
  }, []);
  const onTimeTick = useCallback(() => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

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
      {trialModalOpen && (
        <Suspense fallback={null}>
          <TrialExpiredModal onClose={() => setTrialModalOpen(false)} />
        </Suspense>
      )}
      <header className="sticky top-0 z-30 border-b border-cream/10 bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={32} />
          </Link>
          <div className="flex items-center gap-4">
            {countdown && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-cream/15 bg-cream/5 px-3 py-1 text-[11px] uppercase tracking-widest text-cream/70">
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
          ref={playerShellRef}
          className="group/player mt-0 relative overflow-hidden border-y border-cream/10 shadow-2xl shadow-black/60 aspect-video md:mt-4 md:rounded-xl md:border"
          style={!showPlayer ? posterStyle : { background: "#000" }}
          onPointerMove={() => showPlayer && revealOverlay()}
          onPointerDown={onPlayerPointerDown}
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
                autoPlay={resumePrompt === null}
                playsInline
                controlsList="nodownload"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={() => { onTimeUpdate(); onTimeTick(); }}
                onEnded={() => { onEnded(); setPlaying(false); setOverlayVisible(true); }}
                onVolumeChange={onVolumeChange}
                onPlay={onPlayEvt}
                onPause={onPauseEvt}
                onDurationChange={onDurationChangeEvt}
                onProgress={onProgressEvt}
                onClick={togglePlay}
                className="absolute inset-0 h-full w-full bg-black cursor-pointer"
              />

              {/* ---- Cinematic overlay ---- */}
              <div
                className={`pointer-events-none absolute inset-0 z-[5] transition-opacity duration-300 ${
                  overlayVisible || !playing ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={!overlayVisible && playing}
              >
                {/* Top gradient + back/title bar */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 to-transparent" />
                <div className={`pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 ${overlayVisible || !playing ? "" : "pointer-events-none"}`}>
                  <Link
                    to="/films/$slug"
                    params={{ slug: film.slug }}
                    aria-label={t.back}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cream/15 bg-black/30 text-cream/85 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-amber/50 hover:text-amber"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={dir === "rtl" ? { transform: "scaleX(-1)" } : undefined}>
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[14px] font-medium text-cream-bright drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] md:text-[15px] ${fa ? "font-vazir" : "font-display"}`}>
                      {title}
                    </div>
                    {director && (
                      <div className="truncate text-[11px] text-cream/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                        {fa ? "کارگردان " : "Dir. "}{director}
                      </div>
                    )}
                  </div>
                </div>

                {/* Center play / pause (only show big icon when paused) */}
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={fa ? "پخش" : "Play"}
                    className="pointer-events-auto absolute left-1/2 top-1/2 flex h-18 w-18 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-cream/20 bg-black/45 text-cream-bright backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-amber/60 hover:text-amber"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}

                {/* Bottom gradient + control bar */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className={`pointer-events-auto absolute inset-x-0 bottom-0 px-4 pb-3 pt-2 md:px-6 md:pb-5 ${overlayVisible || !playing ? "" : "pointer-events-none"}`}>
                  {/* Scrubber */}
                  <div
                    ref={scrubRef}
                    onPointerDown={onScrubPointerDown}
                    onPointerMove={onScrubPointerMove}
                    onPointerUp={onScrubPointerUp}
                    onPointerCancel={onScrubPointerUp}
                    className="group/scrub relative h-6 cursor-pointer touch-none select-none"
                    role="slider"
                    aria-label={fa ? "موقعیت پخش" : "Playback position"}
                    aria-valuemin={0}
                    aria-valuemax={Math.floor(duration) || 0}
                    aria-valuenow={Math.floor(currentTime) || 0}
                  >
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-cream/15 transition-all group-hover/scrub:h-[5px]" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-cream/25 transition-all group-hover/scrub:h-[5px]"
                      style={dir === "rtl" ? { right: 0, width: `${bufPct}%` } : { left: 0, width: `${bufPct}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-amber shadow-[0_0_8px_rgba(201,168,76,0.6)] transition-all group-hover/scrub:h-[5px]"
                      style={dir === "rtl" ? { right: 0, width: `${pct}%` } : { left: 0, width: `${pct}%` }}
                    />
                    <div
                      className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_10px_rgba(201,168,76,0.8)] transition-transform ${scrubbing ? "scale-125" : "scale-0 group-hover/scrub:scale-100"}`}
                      style={dir === "rtl"
                        ? { right: `calc(${pct}% - 7px)` }
                        : { left: `calc(${pct}% - 7px)` }}
                    />
                  </div>

                  {/* Time + buttons row */}
                  <div className="mt-2 flex items-center gap-3 text-[12px] text-cream/85">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={playing ? (fa ? "مکث" : "Pause") : (fa ? "پخش" : "Play")}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-cream-bright transition-all hover:scale-110 hover:text-amber"
                    >
                      {playing ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={muted ? (fa ? "صدادار" : "Unmute") : (fa ? "بی‌صدا" : "Mute")}
                      className="hidden h-9 w-9 items-center justify-center rounded-md text-cream/85 transition-all hover:scale-110 hover:text-amber sm:flex"
                    >
                      {muted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M11 5 6 9H2v6h4l5 4Z" />
                          <path d="m22 9-6 6M16 9l6 6" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M11 5 6 9H2v6h4l5 4Z" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      )}
                    </button>
                    <span className="tabular-nums tracking-wide text-cream-bright drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {fmtTime(currentTime)}
                    </span>
                    <span className="text-cream/40">/</span>
                    <span className="tabular-nums tracking-wide text-cream/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {fmtTime(duration)}
                    </span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? (fa ? "خروج از تمام‌صفحه" : "Exit fullscreen") : (fa ? "تمام‌صفحه" : "Fullscreen")}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-cream/85 transition-all hover:scale-110 hover:text-amber"
                    >
                      {isFullscreen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Double-tap seek ripple */}
              {seekRipple && (
                <div
                  key={seekRipple.key}
                  className={`pointer-events-none absolute top-1/2 z-[6] -translate-y-1/2 flex h-24 w-24 items-center justify-center rounded-full border border-amber/40 bg-amber/10 text-amber backdrop-blur-sm animate-fade-in ${
                    seekRipple.side === "right" ? "right-[15%]" : "left-[15%]"
                  }`}
                >
                  <div className="text-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={seekRipple.side === "left" ? { transform: "scaleX(-1)" } : undefined}>
                      <path d="M5 4v16l7-5-7-5 7-3-7-3z" opacity="0.6" />
                      <path d="M13 4v16l7-5-7-5 7-3-7-3z" />
                    </svg>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
                      {seekRipple.side === "right" ? "+10s" : "−10s"}
                    </div>
                  </div>
                </div>
              )}

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
                <div className="pointer-events-none absolute top-4 left-1/2 z-[7] -translate-x-1/2 rounded-md border border-cream/15 bg-bg-0/85 backdrop-blur px-4 py-1.5 text-xs text-cream/90 shadow-lg animate-fade-in">
                  {hud}
                </div>
              )}
            </>
          )}
        </div>

        {/* Title block */}
        <div className="mt-5 grid gap-6 px-5 md:mt-6 md:grid-cols-[1fr_auto] md:items-start md:px-0">
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
            <div className="rounded-lg border border-cream/10 bg-cream/3 px-4 py-3 text-xs text-cream/70 sm:hidden">
              <div className="uppercase tracking-widest text-[10px] text-cream/45">{t.accessRemaining}</div>
              <div className="mt-0.5 text-cream-bright">{num(countdown.h)}h {num(countdown.m)}m</div>
            </div>
          )}
        </div>

        {/* About + shortcuts */}
        <div className="mt-7 grid gap-8 px-5 pb-10 md:mt-8 md:grid-cols-3 md:px-0 md:pb-0">
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
                  <kbd className="rounded border border-cream/15 bg-cream/4 px-1.5 py-0.5 font-mono text-[10px] text-cream/80">
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
