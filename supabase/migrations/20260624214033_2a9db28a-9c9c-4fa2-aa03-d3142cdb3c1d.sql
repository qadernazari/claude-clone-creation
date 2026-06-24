
CREATE TABLE IF NOT EXISTS public.parental_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only; do NOT grant to authenticated/anon. All access goes through server functions using the service role.
GRANT ALL ON public.parental_credentials TO service_role;

ALTER TABLE public.parental_credentials ENABLE ROW LEVEL SECURITY;

-- Backfill any existing PINs (legacy plaintext) into the new table.
INSERT INTO public.parental_credentials (user_id, pin_hash)
SELECT id, parental_pin
FROM public.profiles
WHERE parental_pin IS NOT NULL AND length(parental_pin) > 0
ON CONFLICT (user_id) DO NOTHING;

-- Remove the column from profiles so it is no longer reachable via the Data API.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS parental_pin;

CREATE TRIGGER parental_credentials_touch
BEFORE UPDATE ON public.parental_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
