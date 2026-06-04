ALTER TABLE public.films
  ADD COLUMN IF NOT EXISTS age_rating text,
  ADD COLUMN IF NOT EXISTS has_4k boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_captions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_subtitles boolean NOT NULL DEFAULT false;