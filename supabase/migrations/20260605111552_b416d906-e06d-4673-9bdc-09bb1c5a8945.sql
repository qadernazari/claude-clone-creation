-- Restrict video_url so it is never readable via PostgREST.
-- Replace table-level SELECT for anon/authenticated with column-level SELECT
-- on every column EXCEPT video_url. Service role keeps full access.

REVOKE SELECT ON public.films FROM anon;
REVOKE SELECT ON public.films FROM authenticated;

GRANT SELECT (
  id, slug, title_en, title_fa, synopsis_en, synopsis_fa,
  director_en, director_fa, category, year, duration_min,
  price_cents, price_toman, ticket_hours, access_mode,
  poster_gradient, cover_url, preview_url, visibility, sort_order,
  created_at, updated_at, access_type, is_premium, thumbnail_url,
  age_rating, has_4k, has_captions, has_subtitles
) ON public.films TO anon, authenticated;

-- Ensure authenticated admins keep write capability (RLS still gates rows).
GRANT INSERT, UPDATE, DELETE ON public.films TO authenticated;
GRANT ALL ON public.films TO service_role;