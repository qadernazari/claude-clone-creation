import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const upsertWatchProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    filmId: string;
    positionSeconds: number;
    durationSeconds?: number | null;
    completed?: boolean;
  }) =>
    z.object({
      filmId: uuid,
      positionSeconds: z.number().int().min(0).max(60 * 60 * 24),
      durationSeconds: z.number().int().min(0).max(60 * 60 * 24).nullable().optional(),
      completed: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("watch_progress")
      .upsert(
        {
          user_id: userId,
          film_id: data.filmId,
          position_seconds: data.positionSeconds,
          duration_seconds: data.durationSeconds ?? null,
          completed: data.completed ?? false,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,film_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmId: string; add: boolean }) =>
    z.object({ filmId: uuid, add: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.add) {
      const { error } = await supabase
        .from("watchlist")
        .upsert({ user_id: userId, film_id: data.filmId }, { onConflict: "user_id,film_id" });
      if (error) throw new Error(error.message);
      return { inWatchlist: true };
    } else {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", userId)
        .eq("film_id", data.filmId);
      if (error) throw new Error(error.message);
      return { inWatchlist: false };
    }
  });

export type LibraryFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  poster_gradient: string | null;
  duration_min: number | null;
  year: number | null;
  access_type: string;
  is_premium: boolean;
};

export type LibraryData = {
  continueWatching: Array<{
    film: LibraryFilm;
    position_seconds: number;
    duration_seconds: number | null;
    last_watched_at: string;
  }>;
  watchlist: Array<{ film: LibraryFilm; created_at: string }>;
  history: Array<{
    film: LibraryFilm;
    position_seconds: number;
    duration_seconds: number | null;
    last_watched_at: string;
    completed: boolean;
  }>;
  activeTickets: Array<{
    id: string;
    film: LibraryFilm;
    expires_at: string;
    paid_at: string | null;
  }>;
  expiredTickets: Array<{
    id: string;
    film: LibraryFilm;
    expires_at: string;
    paid_at: string | null;
    amount: number;
    currency: string;
  }>;
};

const FILM_COLS =
  "id, slug, title_en, title_fa, director_en, director_fa, cover_url, poster_gradient, duration_min, year, access_type, is_premium";

export const getLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LibraryData> => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();

    const [progressRes, watchlistRes, ticketsRes] = await Promise.all([
      supabase
        .from("watch_progress")
        .select(`position_seconds, duration_seconds, completed, last_watched_at, film:films(${FILM_COLS})`)
        .eq("user_id", userId)
        .order("last_watched_at", { ascending: false })
        .limit(60),
      supabase
        .from("watchlist")
        .select(`created_at, film:films(${FILM_COLS})`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("tickets")
        .select(`id, status, amount, currency, paid_at, expires_at, film:films(${FILM_COLS})`)
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    if (progressRes.error) throw new Error(progressRes.error.message);
    if (watchlistRes.error) throw new Error(watchlistRes.error.message);
    if (ticketsRes.error) throw new Error(ticketsRes.error.message);

    const progressRows = (progressRes.data ?? []) as any[];
    const watchlistRows = (watchlistRes.data ?? []) as any[];
    const ticketRows = (ticketsRes.data ?? []) as any[];

    const continueWatching = progressRows
      .filter((r) => r.film && !r.completed && r.position_seconds > 10)
      .slice(0, 20)
      .map((r) => ({
        film: r.film as LibraryFilm,
        position_seconds: r.position_seconds,
        duration_seconds: r.duration_seconds,
        last_watched_at: r.last_watched_at,
      }));

    const history = progressRows
      .filter((r) => r.film)
      .map((r) => ({
        film: r.film as LibraryFilm,
        position_seconds: r.position_seconds,
        duration_seconds: r.duration_seconds,
        last_watched_at: r.last_watched_at,
        completed: r.completed,
      }));

    const watchlist = watchlistRows
      .filter((r) => r.film)
      .map((r) => ({ film: r.film as LibraryFilm, created_at: r.created_at }));

    const activeTickets = ticketRows
      .filter((r) => r.film && r.expires_at && r.expires_at > nowIso)
      .map((r) => ({
        id: r.id,
        film: r.film as LibraryFilm,
        expires_at: r.expires_at,
        paid_at: r.paid_at,
      }));

    const expiredTickets = ticketRows
      .filter((r) => r.film && (!r.expires_at || r.expires_at <= nowIso))
      .map((r) => ({
        id: r.id,
        film: r.film as LibraryFilm,
        expires_at: r.expires_at,
        paid_at: r.paid_at,
        amount: r.amount,
        currency: r.currency,
      }));

    return { continueWatching, watchlist, history, activeTickets, expiredTickets };
  });

export const getWatchlistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmId: string }) => z.object({ filmId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("film_id", data.filmId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { inWatchlist: !!row };
  });

export const getResumePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmId: string }) => z.object({ filmId: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("watch_progress")
      .select("position_seconds, duration_seconds, completed")
      .eq("user_id", userId)
      .eq("film_id", data.filmId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      positionSeconds: row?.position_seconds ?? 0,
      durationSeconds: row?.duration_seconds ?? null,
      completed: row?.completed ?? false,
    };
  });
