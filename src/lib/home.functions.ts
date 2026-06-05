import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

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

export type HomePageData = {
  featured: HomeFeaturedFilm | null;
  films: HomeRailFilm[];
  categories: HomeCategory[];
};

export const getHomePageData = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomePageData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [featuredRes, filmsRes, categoriesRes] = await Promise.all([
      supabaseAdmin
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, synopsis_en, synopsis_fa, poster_gradient, cover_url, thumbnail_url, mobile_cover_url, is_premium",
        )
        .eq("visibility", "published")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("films")
        .select(
          "id, slug, title_en, title_fa, director_en, director_fa, category, year, duration_min, poster_gradient, cover_url, thumbnail_url, access_type, is_premium, sort_order",
        )
        .eq("visibility", "published")
        .order("sort_order", { ascending: true })
        .limit(60),
      supabaseAdmin
        .from("categories")
        .select("id, name_en, name_fa, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (featuredRes.error) throw new Error(featuredRes.error.message);
    if (filmsRes.error) throw new Error(filmsRes.error.message);
    if (categoriesRes.error) throw new Error(categoriesRes.error.message);

    return {
      featured: (featuredRes.data as HomeFeaturedFilm | null) ?? null,
      films: (filmsRes.data as HomeRailFilm[] | null) ?? [],
      categories: (categoriesRes.data as HomeCategory[] | null) ?? [],
    };
  },
);

export const homePageQueryOptions = queryOptions({
  queryKey: ["home", "page-data"],
  queryFn: () => getHomePageData(),
  staleTime: 60_000,
});