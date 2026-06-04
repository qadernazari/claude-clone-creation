
-- WATCH PROGRESS
CREATE TABLE public.watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, film_id)
);
CREATE INDEX watch_progress_user_idx ON public.watch_progress(user_id, last_watched_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress" ON public.watch_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all progress" ON public.watch_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER watch_progress_touch BEFORE UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- WATCHLIST
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, film_id)
);
CREATE INDEX watchlist_user_idx ON public.watchlist(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist" ON public.watchlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all watchlist" ON public.watchlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
