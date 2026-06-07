
-- Series / Episodes structure on films
ALTER TABLE public.films
  ADD COLUMN IF NOT EXISTS film_type TEXT NOT NULL DEFAULT 'movie'
    CHECK (film_type IN ('movie', 'series', 'episode')),
  ADD COLUMN IF NOT EXISTS parent_film_id UUID REFERENCES public.films(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS season_number SMALLINT,
  ADD COLUMN IF NOT EXISTS episode_number SMALLINT;

CREATE INDEX IF NOT EXISTS films_parent_film_id_idx
  ON public.films(parent_film_id)
  WHERE parent_film_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS films_film_type_idx ON public.films(film_type);

-- Ensure episodes reference a parent and have a season/episode number
ALTER TABLE public.films
  DROP CONSTRAINT IF EXISTS films_episode_must_have_parent;
ALTER TABLE public.films
  ADD CONSTRAINT films_episode_must_have_parent
  CHECK (
    film_type <> 'episode'
    OR (parent_film_id IS NOT NULL AND season_number IS NOT NULL AND episode_number IS NOT NULL)
  );

-- Parental controls on user profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parental_pin TEXT
    CHECK (parental_pin IS NULL OR parental_pin ~ '^[0-9]{4,6}$'),
  ADD COLUMN IF NOT EXISTS max_age_rating TEXT
    CHECK (max_age_rating IS NULL OR max_age_rating IN ('G','PG','PG-13','R','NC-17','TV-Y','TV-Y7','TV-G','TV-PG','TV-14','TV-MA'));
