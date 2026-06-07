import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

const ONE_YEAR = 60 * 60 * 24 * 365;

function parseSignedObjectUrl(u: string | null | undefined) {
  if (!u) return null;
  const m = u.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

async function renderResizedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  width: number,
  quality = 68,
): Promise<string | null> {
  if (!original) return null;
  const parsed = parseSignedObjectUrl(original);
  if (!parsed) return original;
  const key = `${parsed.bucket}|${parsed.path}|${width}|${quality}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const { data, error } = await client.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, ONE_YEAR, {
          transform: { width, quality, resize: "contain" as const },
        });
      if (error || !data?.signedUrl) return original;
      return data.signedUrl as string;
    } catch {
      return original;
    }
  })();
  cache.set(key, promise);
  return promise;
}

export type BrowseFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  poster_gradient: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  sort_order: number;
};

export type BrowseCategory = {
  id: string;
  name_en: string;
  name_fa: string | null;
};

export type BrowsePageData = {
  films: BrowseFilm[];
  categories: BrowseCategory[];
};

type RawFilm = Record<string, unknown>;

export const getBrowsePageData = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrowsePageData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [filmsRes, categoriesRes] = await Promise.all([
      supabaseAdmin
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, synopsis_en, synopsis_fa, category, year, duration_min, poster_gradient, cover_url, thumbnail_url, created_at, sort_order",
        )
        .eq("visibility", "published")
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
        // Browse grid shows portrait poster cards — optimize for ~360-400px wide on mobile,
        // up to ~520px on desktop. 600px width is sharp on 2x DPI mobile.
        const [cover, thumbnail] = await Promise.all([
          renderResizedUrl(supabaseAdmin, cache, f.cover_url as string | null, 600, 68),
          renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 600, 68),
        ]);
        return { ...f, cover_url: cover, thumbnail_url: thumbnail } as BrowseFilm;
      }),
    );

    return {
      films,
      categories: (categoriesRes.data as BrowseCategory[] | null) ?? [],
    };
  },
);

export const browsePageQueryOptions = queryOptions({
  queryKey: ["browse", "page-data"],
  queryFn: () => getBrowsePageData(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});
