-- Link contributions to authenticated users and dedupe by provider ref.
ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contributions_user_idx ON public.contributions(user_id);
CREATE INDEX IF NOT EXISTS contributions_film_idx ON public.contributions(film_id);
CREATE UNIQUE INDEX IF NOT EXISTS contributions_provider_ref_uniq
  ON public.contributions(provider_ref) WHERE provider_ref IS NOT NULL;

-- Let users read their own contributions (Admins already covered).
CREATE POLICY "Users read own contributions"
ON public.contributions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);