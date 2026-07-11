
CREATE TABLE public.hero_perf_alerts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewport_bucket TEXT NOT NULL,
  alert_kind TEXT NOT NULL,
  lcp_p75_ms INTEGER,
  cache_hit_rate REAL,
  sample_count INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[],
  detail JSONB
);

CREATE INDEX hero_perf_alerts_recent_idx
  ON public.hero_perf_alerts (viewport_bucket, alert_kind, created_at DESC);

GRANT SELECT ON public.hero_perf_alerts TO authenticated;
GRANT ALL ON public.hero_perf_alerts TO service_role;

ALTER TABLE public.hero_perf_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read hero_perf_alerts"
  ON public.hero_perf_alerts FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
