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