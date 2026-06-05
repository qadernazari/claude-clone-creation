DROP POLICY IF EXISTS "Public reads film credits" ON public.film_credits;
CREATE POLICY "Public reads published film credits" ON public.film_credits FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.films f WHERE f.id = film_credits.film_id AND f.visibility = 'published')
);