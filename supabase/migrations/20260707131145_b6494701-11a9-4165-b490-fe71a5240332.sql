DROP POLICY IF EXISTS "Public reads site content" ON public.site_content;

CREATE POLICY "Public reads non-sensitive site content"
  ON public.site_content
  FOR SELECT
  TO anon, authenticated
  USING (key <> 'payment_provider_ids');