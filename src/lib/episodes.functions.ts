import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

export type EpisodeSummary = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  duration_min: number | null;
  season_number: number;
  episode_number: number;
  thumbnail_url: string | null;
  cover_url: string | null;
};

export const getEpisodesForSeries = createServerFn({ method: "GET" })
  .inputValidator((data: { seriesId: string }) =>
    z.object({ seriesId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<EpisodeSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("films")
      .select(
        "id, slug, title_en, title_fa, synopsis_en, synopsis_fa, duration_min, season_number, episode_number, thumbnail_url, cover_url",
      )
      .eq("parent_film_id", data.seriesId)
      .eq("film_type", "episode")
      .eq("visibility", "published")
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as EpisodeSummary[];
  });

export const episodesQueryOptions = (seriesId: string) =>
  queryOptions({
    queryKey: ["episodes", seriesId],
    queryFn: () => getEpisodesForSeries({ data: { seriesId } }),
    staleTime: 60_000,
  });
