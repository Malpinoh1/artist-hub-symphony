-- Add artist_name column to releases table to store the display artist name
-- This allows releases to show different artist names than the account owner
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS artist_name TEXT;

-- Update existing releases to use the artist name from the artists table
UPDATE public.releases r
SET artist_name = a.name
FROM public.artists a
WHERE r.artist_id = a.id AND r.artist_name IS NULL;