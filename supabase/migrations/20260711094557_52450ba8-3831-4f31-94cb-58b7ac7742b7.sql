CREATE TABLE IF NOT EXISTS public.hero_perf_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  url TEXT,
  lcp_ms INTEGER,
  lcp_size INTEGER,
  ttfb_ms INTEGER,
  resp_end_ms INTEGER,
  transfer_bytes INTEGER,
  encoded_bytes INTEGER,
  protocol TEXT,
  decode_ms INTEGER,
  viewport_w INTEGER,
  dpr REAL,
  effective_type TEXT,
  downlink REAL,
  ua_mobile BOOLEAN,
  country TEXT
);

CREATE INDEX IF NOT EXISTS hero_perf_logs_created_idx ON public.hero_perf_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS hero_perf_logs_effective_type_idx ON public.hero_perf_logs (effective_type);
CREATE INDEX IF NOT EXISTS hero_perf_logs_country_idx ON public.hero_perf_logs (country);

GRANT SELECT ON public.hero_perf_logs TO authenticated;
GRANT ALL ON public.hero_perf_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hero_perf_logs_id_seq TO service_role;

ALTER TABLE public.hero_perf_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read hero_perf_logs"
ON public.hero_perf_logs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));