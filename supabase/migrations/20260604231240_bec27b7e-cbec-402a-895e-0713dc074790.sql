
-- 1. Trials table
CREATE TABLE public.trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  country text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | expired | converted
  converted_at timestamptz,
  reminders_sent jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trials_user_unique UNIQUE (user_id),
  CONSTRAINT trials_email_unique UNIQUE (email)
);

CREATE INDEX idx_trials_status_ends_at ON public.trials(status, ends_at);
CREATE INDEX idx_trials_user_id ON public.trials(user_id);

GRANT SELECT ON public.trials TO authenticated;
GRANT ALL ON public.trials TO service_role;

ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trial"
  ON public.trials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all trials"
  ON public.trials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trials_touch
  BEFORE UPDATE ON public.trials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. has_active_trial helper
CREATE OR REPLACE FUNCTION public.has_active_trial(user_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trials
    WHERE user_id = user_uuid
      AND status = 'active'
      AND ends_at > now()
  );
$$;

-- 3. Combined membership access helper (sub OR trial)
CREATE OR REPLACE FUNCTION public.has_membership_access(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_active_subscription(user_uuid, check_env)
      OR public.has_active_trial(user_uuid);
$$;
