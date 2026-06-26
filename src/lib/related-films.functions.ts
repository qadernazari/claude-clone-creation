import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { makeRenderCache, renderResizedUrl } from "./storage-render.server";

export type RelatedFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  duration_min: number | null;
  year: number | null;
  cover_url: string | null;
  poster_gradient: string | null;
};

export const getRelatedFilms = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        filmId: z.string().min(1),
        category: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<RelatedFilm[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("films")
      .select(
        "id, slug, title_en, title_fa, director_en, director_fa, duration_min, year, cover_url, poster_gradient",
      )
      .eq("visibility", "published")
      .neq("id", data.filmId)
      .order("sort_order", { ascending: true })
      .limit(18);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const cache = makeRenderCache();
    const out = await Promise.all(
      (rows ?? []).map(async (f) => ({
        ...(f as RelatedFilm),
        cover_url: await renderResizedUrl(
          supabaseAdmin,
          cache,
          (f as RelatedFilm).cover_url,
          380,
          62,
        ),
      })),
    );
    return out as RelatedFilm[];
  });

export const relatedFilmsQueryOptions = (filmId: string, category: string | null) =>
  queryOptions({
    queryKey: ["film", filmId, "related", category],
    queryFn: () => getRelatedFilms({ data: { filmId, category } }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
