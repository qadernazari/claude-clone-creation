DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 254
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND locale IN ('en', 'fa')
  );