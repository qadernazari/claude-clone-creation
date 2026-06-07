
CREATE TABLE public.film_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (film_id, user_id)
);

CREATE INDEX film_reviews_film_id_idx ON public.film_reviews(film_id);
CREATE INDEX film_reviews_user_id_idx ON public.film_reviews(user_id);
CREATE INDEX film_reviews_created_at_idx ON public.film_reviews(created_at DESC);

GRANT SELECT ON public.film_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.film_reviews TO authenticated;
GRANT ALL ON public.film_reviews TO service_role;

ALTER TABLE public.film_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.film_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON public.film_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.film_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.film_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER film_reviews_touch_updated_at
  BEFORE UPDATE ON public.film_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE VIEW public.film_rating_aggregates
WITH (security_invoker = true) AS
SELECT
  film_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*)::int AS review_count
FROM public.film_reviews
GROUP BY film_id;

GRANT SELECT ON public.film_rating_aggregates TO anon, authenticated, service_role;
