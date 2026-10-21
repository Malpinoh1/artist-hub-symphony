-- Apply configured track-level royalty splits during ONErpm and other royalty upload processing.
-- A split is used only when every non-declined recipient has a linked artist account;
-- otherwise the existing match path is preserved until the invitation is accepted/linked.
DO $migration$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);

  v_old := '  v_distributor text;';
  v_new := '  v_distributor text; v_split_pct numeric;';
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Could not safely patch process_royalty_upload declaration';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := $old$    v_per_artist := ROUND(v_safe_net / array_length(v_matched_ids,1), 4);$old$;
  v_new := $new$    -- If a track has a complete split with linked accounts, allocate this royalty
    -- across the split recipients rather than equally among the matched performers.
    IF v_track_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.splits s WHERE s.track_id = v_track_id AND s.status IN ('active','locked'))
       AND NOT EXISTS (
         SELECT 1
         FROM public.splits s
         JOIN public.split_recipients sr ON sr.split_id = s.id
         WHERE s.track_id = v_track_id
           AND sr.status <> 'declined'
           AND sr.artist_id IS NULL
       ) THEN
      SELECT array_agg(sr.artist_id ORDER BY sr.invited_at, sr.id)
        INTO v_matched_ids
      FROM public.splits s
      JOIN public.split_recipients sr ON sr.split_id = s.id
      WHERE s.track_id = v_track_id
        AND s.status IN ('active','locked')
        AND sr.status <> 'declined'
        AND sr.artist_id IS NOT NULL;
    END IF;

    v_per_artist := ROUND(v_safe_net / array_length(v_matched_ids,1), 4);$new$;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Could not safely patch process_royalty_upload split allocation point';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := $old$    FOR v_artist IN SELECT unnest(v_matched_ids) AS id LOOP
      INSERT INTO public.monthly_artist_earnings$old$;
  v_new := $new$    FOR v_artist IN SELECT unnest(v_matched_ids) AS id LOOP
      v_split_pct := NULL;
      IF v_track_id IS NOT NULL THEN
        SELECT sr.percentage INTO v_split_pct
        FROM public.splits s
        JOIN public.split_recipients sr ON sr.split_id = s.id
        WHERE s.track_id = v_track_id
          AND s.status IN ('active','locked')
          AND sr.artist_id = v_artist.id
          AND sr.status <> 'declined'
        ORDER BY sr.invited_at
        LIMIT 1;
      END IF;
      IF v_split_pct IS NOT NULL THEN
        v_per_artist := ROUND(v_safe_net * v_split_pct / 100, 4);
      END IF;

      INSERT INTO public.monthly_artist_earnings$new$;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Could not safely patch process_royalty_upload recipient loop';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  EXECUTE v_def;
END
$migration$;
