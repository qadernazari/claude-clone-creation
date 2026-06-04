
-- Restrict access to the sensitive video_url column on public.films.
-- It contains pre-signed URLs to protected video assets and must NOT be
-- reachable from the browser; only server-side code (service_role) should
-- read or write it.

REVOKE SELECT, INSERT, UPDATE ON public.films FROM anon, authenticated;

-- Re-grant column-level privileges to every column EXCEPT video_url.
GRANT SELECT (
  id, slug, title_en, title_fa, synopsis_en, synopsis_fa,
  director_en, director_fa, category, year, duration_min,
  price_cents, price_toman, ticket_hours, access_mode, poster_gradient,
  cover_url, preview_url, visibility, sort_order, created_at, updated_at,
  access_type, is_premium, thumbnail_url, age_rating, has_4k,
  has_captions, has_subtitles
) ON public.films TO anon, authenticated;

GRANT INSERT (
  id, slug, title_en, title_fa, synopsis_en, synopsis_fa,
  director_en, director_fa, category, year, duration_min,
  price_cents, price_toman, ticket_hours, access_mode, poster_gradient,
  cover_url, preview_url, visibility, sort_order,
  access_type, is_premium, thumbnail_url, age_rating, has_4k,
  has_captions, has_subtitles
) ON public.films TO authenticated;

GRANT UPDATE (
  slug, title_en, title_fa, synopsis_en, synopsis_fa,
  director_en, director_fa, category, year, duration_min,
  price_cents, price_toman, ticket_hours, access_mode, poster_gradient,
  cover_url, preview_url, visibility, sort_order,
  access_type, is_premium, thumbnail_url, age_rating, has_4k,
  has_captions, has_subtitles
) ON public.films TO authenticated;

-- service_role retains full access via the existing GRANT ALL.
GRANT ALL ON public.films TO service_role;
