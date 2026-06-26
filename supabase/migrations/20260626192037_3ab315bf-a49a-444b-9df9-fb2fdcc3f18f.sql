REVOKE SELECT ON public.films FROM anon;
REVOKE SELECT ON public.films FROM authenticated;
GRANT SELECT (
  id, slug, title_en, title_fa, synopsis_en, synopsis_fa, director_en, director_fa,
  category, year, duration_min, price_cents, price_toman, ticket_hours,
  access_mode, access_type, is_premium, poster_gradient, cover_url, thumbnail_url,
  mobile_cover_url, preview_url, visibility, sort_order, age_rating, has_4k,
  has_captions, has_subtitles, film_type, parent_film_id, season_number, episode_number,
  subtitles, created_at, updated_at
) ON public.films TO anon, authenticated;
REVOKE SELECT (video_url) ON public.films FROM anon, authenticated;
GRANT SELECT (video_url) ON public.films TO service_role;