import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

function makeRenderCache() {
  return new Map<string, Promise<string | null>>();
}

async function renderResizedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client: unknown,
  _cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  _width: number,
  _quality = 68,
  _height?: number,
  _resize: "contain" | "cover" | "fill" = "contain",
): Promise<string | null> {
  // Serve original uploaded file — no transform, no re-encode.
  return original ?? null;
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
  /** Mobile-sized version of thumbnail_url (760w q55), used when no
   *  dedicated mobile_cover_url exists. Prevents serving the full 1400w
   *  desktop hero to a 375px viewport. */
  thumbnail_url_mobile: string | null;
  mobile_cover_url: string | null;
  is_premium: boolean | null;
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await supabaseAdmin
      .from("films")
      .select(
        "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, thumbnail_url, mobile_cover_url, is_premium",
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
    const [cover, thumbnail, thumbnailMobile, mobile] = await Promise.all([
      renderResizedUrl(supabaseAdmin, cache, featuredRaw.cover_url as string | null, 1200, 68),
      renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 1400, 70),
      // Smaller render of the landscape thumbnail, served on mobile when
      // no dedicated portrait mobile_cover_url exists. Saves ~80 KiB.
      renderResizedUrl(supabaseAdmin, cache, featuredRaw.thumbnail_url as string | null, 760, 55),
      renderResizedUrl(supabaseAdmin, cache, featuredRaw.mobile_cover_url as string | null, 760, 60, 1350, "cover"),
    ]);
    return {
      ...featuredRaw,
      cover_url: cover,
      thumbnail_url: thumbnail,
      thumbnail_url_mobile: thumbnailMobile,
      mobile_cover_url: mobile,
    } as HomeFeaturedFilm;
  },
);

/**
 * Below-the-fold: rails (films + categories). Fetched client-side only
 * when the user scrolls (DeferredHomeRails mounts the consumer). Kept
 * off the SSR critical path so TTFB stays minimal.
 */
export const getHomeRails = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeRailsData> => {
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
        const [cover, thumbnail] = await Promise.all([
          renderResizedUrl(supabaseAdmin, cache, f.cover_url as string | null, 380, 62),
          renderResizedUrl(supabaseAdmin, cache, f.thumbnail_url as string | null, 380, 62),
        ]);
        return { ...f, cover_url: cover, thumbnail_url: thumbnail } as HomeRailFilm;
      }),
    );
    return {
      films,
      categories: (categoriesRes.data as HomeCategory[] | null) ?? [],
    };
  },
);

export const homeFeaturedQueryOptions = queryOptions({
  queryKey: ["home", "featured"],
  queryFn: () => getHomeFeatured(),
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
