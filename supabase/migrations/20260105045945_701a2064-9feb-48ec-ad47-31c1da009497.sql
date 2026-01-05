-- Add team_name column to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.artists.team_name IS 'Optional team name for the artist account';