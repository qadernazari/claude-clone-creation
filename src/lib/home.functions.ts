import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

const ONE_YEAR = 60 * 60 * 24 * 365;

function parseSignedObjectUrl(u: string | null | undefined) {
  if (!u) return null;
  const m = u.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

// Cross-request in-memory cache for resized signed URLs. A signed URL with a
// 1-year expiry is safe to memoize for the lifetime of the worker instance —
// repeat SSR calls then skip the expensive `storage.createSignedUrl` round
// trip entirely. Cap to keep memory bounded.
const GLOBAL_URL_CACHE = new Map<string, string>();
const GLOBAL_URL_CACHE_MAX = 2000;

function makeRenderCache() {
  return new Map<string, Promise<string | null>>();
}

async function renderResizedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  width: number,
  quality = 68,
  height?: number,
  resize: "contain" | "cover" | "fill" = "contain",
): Promise<string | null> {
  if (!original) return null;
  const parsed = parseSignedObjectUrl(original);
  if (!parsed) return original;
  const key = `${parsed.bucket}|${parsed.path}|${width}|${height ?? 0}|${resize}|${quality}`;
  const cached = GLOBAL_URL_CACHE.get(key);
  if (cached) return cached;
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const transform: { width: number; height?: number; quality: number; resize: "contain" | "cover" | "fill" } = { width, quality, resize };
      if (height) transform.height = height;
      const { data, error } = await client.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, ONE_YEAR, { transform });
      if (error || !data?.signedUrl) return original;
      const url = data.signedUrl as string;
      if (GLOBAL_URL_CACHE.size >= GLOBAL_URL_CACHE_MAX) {
        const firstKey = GLOBAL_URL_CACHE.keys().next().value;
        if (firstKey) GLOBAL_URL_CACHE.delete(firstKey);
      }
      GLOBAL_URL_CACHE.set(key, url);
      return url;
    } catch {
      return original;
    }
  })();
  cache.set(key, promise);
  return promise;
}

export type HomeFeaturedFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  poster_gradient: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  thumbnail_url_1280: string | null;
  thumbnail_url_2400: string | null;
  /** Mobile-sized version of thumbnail_url, used when no dedicated mobile_cover_url exists. */
  thumbnail_url_mobile: string | null;
  mobile_cover_url: string | null;
  is_premium: boolean | null;
  cover_fit: string | null;
  cover_position: string | null;
};

export type HomeRailFilm = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  poster_gradient: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  thumbnail_url_520: string | null;
  thumbnail_url_1040: string | null;
  access_type: string;
  is_premium: boolean | null;
  sort_order: number | null;
};

export type HomeCategory = {
  id: string;
  name_en: string;
  name_fa: string | null;
  sort_order: number | null;
};

export type HomeRailsData = {
  films: HomeRailFilm[];
  categories: HomeCategory[];
};

// Legacy combined type — kept so existing imports keep typechecking. Callers
// should migrate to the split queries below.
export type HomePageData = {
  featured: HomeFeaturedFilm | null;
  films: HomeRailFilm[];
  categories: HomeCategory[];
};

type RawFilm = Record<string, unknown>;

/**
 * SSR-critical: just the featured (hero) film. Tiny query, single row.
 * Loader awaits this so first byte already contains the LCP image URL.
 */
export const getHomeFeatured = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeaturedFilm | null> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const res = await supabaseAdmin
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, thumbnail_url, mobile_cover_url, is_premium, cover_fit, cover_position",
        )
        .eq("visibility", "published")
        .neq("film_type", "episode")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      const featuredRaw = res.data as RawFilm | null;
      if (!featuredRaw) return null;
      const cache = makeRenderCache();
      const [cover, thumbnail, thumbnail1280, thumbnail2400, thumbnailMobile, mobile] = await Promise.all([
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.cover_url as string | null, 800, 75),
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 1920, 90),
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 1280, 88),
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 2400, 90),
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 800, 75),
        renderResizedUrl(supabaseAdmin, cache, featuredRaw.mobile_cover_url as string | null, 800, 75, 1200, "cover"),
      ]);

      return {
        ...featuredRaw,
        cover_url: cover,
        thumbnail_url: thumbnail,
        thumbnail_url_1280: thumbnail1280,
        thumbnail_url_2400: thumbnail2400,
        thumbnail_url_mobile: thumbnailMobile,
        mobile_cover_url: mobile,
      } as HomeFeaturedFilm;
    } catch (error) {
      console.error("getHomeFeatured failed:", error);
      return null;
    }
  },
);

/**
 * Below-the-fold: rails (films + categories). Fetched client-side only
 * when the user scrolls (DeferredHomeRails mounts the consumer). Kept
 * off the SSR critical path so TTFB stays minimal.
 */
export const getHomeRails = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeRailsData> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [filmsRes, categoriesRes] = await Promise.all([
        supabaseAdmin
          .from("films")
          .select(
            "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, poster_gradient, cover_url, thumbnail_url, access_type, is_premium, sort_order",
          )
          .eq("visibility", "published")
          .neq("film_type", "episode")
          .order("sort_order", { ascending: true })
          .limit(60),
        supabaseAdmin
          .from("categories")
          .select("id, name_en, name_fa, sort_order")
          .order("sort_order", { ascending: true }),
      ]);
      if (filmsRes.error) throw new Error(filmsRes.error.message);
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);

      const cache = makeRenderCache();
      const filmsRaw = (filmsRes.data as RawFilm[] | null) ?? [];
      const films = await Promise.all(
        filmsRaw.map(async (f) => {
          const [cover, thumbnail, thumbnail520, thumbnail1040] = await Promise.all([
            renderResizedUrl(supabaseAdmin, cache, f.cover_url as string | null, 520, 80),
            renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 760, 86, 428, "cover"),
            renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 520, 84, 293, "cover"),
            renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 1040, 86, 585, "cover"),
          ]);
          return { ...f, cover_url: cover, thumbnail_url: thumbnail, thumbnail_url_520: thumbnail520, thumbnail_url_1040: thumbnail1040 } as HomeRailFilm;
        }),
      );
      return {
        films,
        categories: (categoriesRes.data as HomeCategory[] | null) ?? [],
      };
    } catch (error) {
      console.error("getHomeRails failed:", error);
      return { films: [], categories: [] };
    }
  },
);

export const homeFeaturedQueryOptions = queryOptions({
  queryKey: ["home", "featured"],
  queryFn: () => getHomeFeatured(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

/**
 * Top N featured films for the hero slider. Reuses the same shape as the
 * single-featured query so existing consumers keep working.
 */
export const getHomeFeaturedSlides = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeaturedFilm[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const res = await supabaseAdmin
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, thumbnail_url, mobile_cover_url, is_premium, cover_fit, cover_position",
        )
        .eq("visibility", "published")
        .neq("film_type", "episode")
        .order("sort_order", { ascending: true })
        .limit(5);
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data as RawFilm[] | null) ?? [];
      if (!rows.length) return [];
      const cache = makeRenderCache();
      return Promise.all(
        rows.map(async (raw, idx) => {
          // Only slide[0] is the LCP candidate — full render fan-out.
          // Slides 2..N: cheaper render (skip 1920/2400 desktop variant, skip cover_url).
          if (idx === 0) {
            const [thumbnail1280, thumbnail, mobile] = await Promise.all([
              renderResizedUrl(supabaseAdmin, cache, raw.thumbnail_url as string | null, 1280, 88),
              renderResizedUrl(supabaseAdmin, cache, raw.thumbnail_url as string | null, 1920, 90),
              renderResizedUrl(supabaseAdmin, cache, raw.mobile_cover_url as string | null, 800, 75, 1200, "cover"),
            ]);
            return {
              ...raw,
              cover_url: null,
              thumbnail_url: thumbnail,
              thumbnail_url_1280: thumbnail1280,
              thumbnail_url_2400: null,
              thumbnail_url_mobile: null,
              mobile_cover_url: mobile,
            } as HomeFeaturedFilm;
          }
          const [thumbnail1280, mobile] = await Promise.all([
            renderResizedUrl(supabaseAdmin, cache, raw.thumbnail_url as string | null, 1280, 85),
            renderResizedUrl(supabaseAdmin, cache, raw.mobile_cover_url as string | null, 800, 75, 1200, "cover"),
          ]);
          return {
            ...raw,
            cover_url: null,
            thumbnail_url: thumbnail1280,
            thumbnail_url_1280: thumbnail1280,
            thumbnail_url_2400: null,
            thumbnail_url_mobile: null,
            mobile_cover_url: mobile,
          } as HomeFeaturedFilm;
        }),
      );

    } catch (error) {
      console.error("getHomeFeaturedSlides failed:", error);
      return [];
    }
  },
);

export const homeFeaturedSlidesQueryOptions = queryOptions({
  queryKey: ["home", "featured-slides"],
  queryFn: () => getHomeFeaturedSlides(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

export const homeRailsQueryOptions = queryOptions({
  queryKey: ["home", "rails"],
  queryFn: () => getHomeRails(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

// Back-compat: combined query used by callers that still expect the old
// shape. Internally just composes the two split queries.
export const homePageQueryOptions = queryOptions({
  queryKey: ["home", "page-data"],
  queryFn: async (): Promise<HomePageData> => {
    const [featured, rails] = await Promise.all([getHomeFeatured(), getHomeRails()]);
    return { featured, films: rails.films, categories: rails.categories };
  },
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});
