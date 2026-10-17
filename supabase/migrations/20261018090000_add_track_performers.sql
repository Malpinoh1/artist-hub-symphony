-- Track-level performer credits (separate from featured-artist metadata).
ALTER TABLE public.release_tracks
  ADD COLUMN IF NOT EXISTS performers text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Correct the Runmo - Dance Version credit: both artists performed on the track.
UPDATE public.release_tracks
SET performers = ARRAY['SHEGLASS', 'DJ YK MULE']::text[],
    featured_artists = ARRAY[]::text[]
WHERE id = '5d600e26-6381-4a22-9f29-b9a7584a331f';
