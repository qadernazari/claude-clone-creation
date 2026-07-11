ALTER TABLE public.hero_perf_logs
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS preload_url text;

CREATE INDEX IF NOT EXISTS hero_perf_logs_correlation_id_idx
  ON public.hero_perf_logs (correlation_id);