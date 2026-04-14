
DROP POLICY IF EXISTS "Artists can create splits for own tracks" ON public.royalty_splits;

CREATE POLICY "Artists can create splits for own tracks"
ON public.royalty_splits FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.primary_artist_id = auth.uid())
  AND created_by = auth.uid()
  AND status IN ('pending', 'approved')
);
