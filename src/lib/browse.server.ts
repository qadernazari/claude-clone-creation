import type { BrowseCategory, BrowseFilm, BrowsePageData } from "./browse.types";

async function renderResizedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client: unknown,
  _cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  _width: number,
  _quality = 68,
): Promise<string | null> {
  // Serve original uploaded file — no transform, no re-encode.
  return original ?? null;
}

type RawFilm = Record<string, unknown>;

export async function fetchBrowsePageData(): Promise<BrowsePageData> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [filmsRes, categoriesRes] = await Promise.all([
    supabaseAdmin
      .from("films")
      .select(
        "id, slug, title_en, title_fa, director_en, director_fa, synopsis_en, synopsis_fa, category, year, duration_min, poster_gradient, cover_url, thumbnail_url, created_at, sort_order",
      )
      .eq("visibility", "published")
      .neq("film_type", "episode")
      .limit(200),
    supabaseAdmin
      .from("categories")
      .select("id, name_en, name_fa")
      .order("sort_order", { ascending: true }),
  ]);

  if (filmsRes.error) throw new Error(filmsRes.error.message);
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);

  const cache = new Map<string, Promise<string | null>>();
  const filmsRaw = (filmsRes.data as RawFilm[] | null) ?? [];

  const films = await Promise.all(
    filmsRaw.map(async (f) => {
      const [cover, thumbnail] = await Promise.all([
        renderResizedUrl(supabaseAdmin, cache, f.cover_url as string | null, 520, 65),
        renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 520, 65),
      ]);
      return { ...f, cover_url: cover, thumbnail_url: thumbnail } as BrowseFilm;
    }),
  );

  return {
    films,
    categories: (categoriesRes.data as BrowseCategory[] | null) ?? [],
  };
}