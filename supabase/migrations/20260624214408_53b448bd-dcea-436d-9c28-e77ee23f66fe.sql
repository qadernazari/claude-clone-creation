
-- 1) Hide films.video_url from client roles. Server functions use service_role.
REVOKE SELECT (video_url) ON public.films FROM anon, authenticated;

-- 2) Lock down SECURITY DEFINER helpers that aren't referenced by RLS policies.
-- These leak per-user subscription/trial state if exposed via PostgREST.
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_trial(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_membership_access(uuid, text) FROM PUBLIC, anon, authenticated;

-- 3) Explicit deny policy on parental_credentials (service_role still bypasses RLS).
DROP POLICY IF EXISTS "Deny all client access" ON public.parental_credentials;
CREATE POLICY "Deny all client access"
  ON public.parental_credentials
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- 4) Replace the always-true contact_submissions INSERT check with a real shape check.
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    message IS NOT NULL
    AND length(btrim(message)) > 0
    AND length(message) <= 5000
  );
