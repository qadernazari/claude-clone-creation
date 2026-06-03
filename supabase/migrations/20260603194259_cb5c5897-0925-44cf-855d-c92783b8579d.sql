
-- 1. Hide films.video_url from anon/authenticated clients
REVOKE SELECT (video_url) ON public.films FROM anon;
REVOKE SELECT (video_url) ON public.films FROM authenticated;
GRANT SELECT (video_url) ON public.films TO service_role;

-- 2. Contributions: explicit per-command policies. Inserts/updates/deletes are admin-only;
--    the webhook uses the service role, which bypasses RLS regardless.
CREATE POLICY "Admins insert contributions" ON public.contributions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update contributions" ON public.contributions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete contributions" ON public.contributions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. user_roles: explicit per-command policies preventing self-grant escalation.
--    A pre-existing FOR ALL admin policy is still in place; these make the intent explicit
--    and ensure no accidental permissive INSERT can ever be added.
CREATE POLICY "Only admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
