ALTER TABLE public.hero_perf_logs
  ADD COLUMN IF NOT EXISTS delivery_type text,
  ADD COLUMN IF NOT EXISTS preload_cache_hit boolean,
  ADD COLUMN IF NOT EXISTS resource_initiator text,
  ADD COLUMN IF NOT EXISTS resource_count smallint;