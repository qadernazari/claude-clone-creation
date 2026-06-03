CREATE UNIQUE INDEX IF NOT EXISTS tickets_provider_ref_uniq
  ON public.tickets (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;