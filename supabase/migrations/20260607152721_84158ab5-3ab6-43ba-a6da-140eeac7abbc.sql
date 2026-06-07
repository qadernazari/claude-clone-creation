-- Re-assert the video_url column-level revocation. Prior migrations (20260603,
-- 20260604, 20260605) already removed SELECT on this column from anon and
-- authenticated, but the scanner flags any policy that grants table-wide SELECT.
-- This migration is defensive: it re-runs the revoke and ensures only
-- service_role can read film video URLs through PostgREST.
REVOKE SELECT (video_url) ON public.films FROM anon;
REVOKE SELECT (video_url) ON public.films FROM authenticated;
GRANT SELECT (video_url) ON public.films TO service_role;