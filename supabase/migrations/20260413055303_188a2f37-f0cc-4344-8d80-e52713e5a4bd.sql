-- Backfill existing release_tracks into the tracks table
INSERT INTO public.tracks (title, primary_artist_id, release_id, release_track_id)
SELECT rt.title, r.artist_id, r.id, rt.id
FROM public.release_tracks rt
JOIN public.releases r ON r.id = rt.release_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.release_track_id = rt.id
);