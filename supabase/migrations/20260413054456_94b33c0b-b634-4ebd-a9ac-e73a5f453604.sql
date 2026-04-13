-- Add release_id and release_track_id to tracks table
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id);
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS release_track_id uuid REFERENCES public.release_tracks(id);

-- Add RLS policy for artists to insert their own tracks
CREATE POLICY "Artists can insert their own tracks"
ON public.tracks
FOR INSERT
TO authenticated
WITH CHECK (primary_artist_id = auth.uid());

-- Add RLS policy for artists to view their own tracks
CREATE POLICY "Artists can view their own tracks"
ON public.tracks
FOR SELECT
TO authenticated
USING (primary_artist_id = auth.uid() OR user_is_admin());