import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FilmReview = {
  id: string;
  film_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  author_name: string | null;
};

export type FilmRatingAggregate = {
  avg_rating: number;
  review_count: number;
};

const filmIdSchema = z.object({ filmId: z.string().uuid() });

export const getFilmReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { filmId: string }) => filmIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [reviewsRes, aggRes] = await Promise.all([
      supabaseAdmin
        .from("film_reviews")
        .select("id, film_id, user_id, rating, body, created_at, updated_at")
        .eq("film_id", data.filmId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("film_rating_aggregates")
        .select("avg_rating, review_count")
        .eq("film_id", data.filmId)
        .maybeSingle(),
    ]);

    if (reviewsRes.error) throw new Error(reviewsRes.error.message);

    const reviews = reviewsRes.data ?? [];
    const userIds = Array.from(new Set(reviews.map((r) => r.user_id)));
    let profileMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      profileMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, p.full_name ?? null]),
      );
    }

    const enriched: FilmReview[] = reviews.map((r) => ({
      ...r,
      author_name: profileMap[r.user_id] ?? null,
    }));

    return {
      reviews: enriched,
      aggregate: aggRes.data
        ? {
            avg_rating: Number(aggRes.data.avg_rating ?? 0),
            review_count: Number(aggRes.data.review_count ?? 0),
          }
        : { avg_rating: 0, review_count: 0 },
    };
  });

export const filmReviewsQueryOptions = (filmId: string) =>
  queryOptions({
    queryKey: ["film-reviews", filmId],
    queryFn: () => getFilmReviews({ data: { filmId } }),
    staleTime: 30_000,
  });

const submitSchema = z.object({
  filmId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable(),
});

export const submitFilmReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmId: string; rating: number; body?: string | null }) =>
    submitSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cleanBody = data.body?.trim() || null;

    const { error } = await supabase
      .from("film_reviews")
      .upsert(
        {
          film_id: data.filmId,
          user_id: userId,
          rating: data.rating,
          body: cleanBody,
        },
        { onConflict: "film_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyFilmReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmId: string }) => filmIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("film_reviews")
      .delete()
      .eq("film_id", data.filmId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
