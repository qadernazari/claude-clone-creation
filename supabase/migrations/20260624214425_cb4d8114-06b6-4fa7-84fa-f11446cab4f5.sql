
-- Split the films public-read policy so anon does not need EXECUTE on has_role.
DROP POLICY IF EXISTS "Public reads published films" ON public.films;

CREATE POLICY "Anon reads published films"
  ON public.films
  FOR SELECT
  TO anon
  USING (visibility = 'published');

CREATE POLICY "Authenticated reads published or admin films"
  ON public.films
  FOR SELECT
  TO authenticated
  USING (visibility = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

-- Now anon no longer references has_role; revoke EXECUTE from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
