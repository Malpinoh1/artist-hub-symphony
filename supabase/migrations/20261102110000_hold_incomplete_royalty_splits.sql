-- Hold royalty rows until every non-declined split recipient has accepted,
-- is linked to an artist account, and the split totals exactly 100%.
-- Apply split percentages only to accepted recipients.

DO $migration$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);

  v_old := $old$
    -- A complete, linked track split overrides the release owner as recipient.
    IF v_track_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.splits s
         WHERE s.track_id = v_track_id AND s.status IN ('active', 'locked')
       )
       AND NOT EXISTS (
         SELECT 1
         FROM public.splits s
         JOIN public.split_recipients sr ON sr.split_id = s.id
         WHERE s.track_id = v_track_id
           AND s.status IN ('active', 'locked')
           AND sr.status <> 'declined'
           AND sr.artist_id IS NULL
       )
       AND EXISTS (
         SELECT 1
         FROM public.splits s
         JOIN public.split_recipients sr ON sr.split_id = s.id
         WHERE s.track_id = v_track_id
           AND s.status IN ('active', 'locked')
           AND sr.status <> 'declined'
           AND sr.artist_id IS NOT NULL
       ) THEN
      SELECT array_agg(sr.artist_id ORDER BY sr.invited_at, sr.id)
      INTO v_matched_ids
      FROM public.splits s
      JOIN public.split_recipients sr ON sr.split_id = s.id
      WHERE s.track_id = v_track_id
        AND s.status IN ('active', 'locked')
        AND sr.status <> 'declined'
        AND sr.artist_id IS NOT NULL;
    END IF;
$old$;

  v_new := $new$
    -- An active split is authoritative. Never fall back to paying the release
    -- owner when the split is pending, unlinked, duplicated, or not 100%.
    IF v_track_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.splits s
         WHERE s.track_id = v_track_id AND s.status IN ('active', 'locked')
       ) THEN
      IF EXISTS (
        SELECT 1
        FROM public.splits s
        WHERE s.track_id = v_track_id
          AND s.status IN ('active', 'locked')
          AND (
            NOT EXISTS (
              SELECT 1 FROM public.split_recipients sr
              WHERE sr.split_id = s.id AND sr.status <> 'declined'
            )
            OR EXISTS (
              SELECT 1 FROM public.split_recipients sr
              WHERE sr.split_id = s.id
                AND sr.status <> 'declined'
                AND (sr.status <> 'accepted' OR sr.artist_id IS NULL)
            )
            OR (
              SELECT ROUND(COALESCE(SUM(sr.percentage), 0), 4)
              FROM public.split_recipients sr
              WHERE sr.split_id = s.id AND sr.status <> 'declined'
            ) <> 100
            OR (
              SELECT COUNT(*) <> COUNT(DISTINCT sr.artist_id)
              FROM public.split_recipients sr
              WHERE sr.split_id = s.id AND sr.status = 'accepted'
            )
          )
      ) THEN
        UPDATE public.royalty_upload_rows
        SET matched_artist_ids = '{}',
            match_status = 'unmatched',
            assigned_amount_per_artist = 0,
            distributor_code = v_distributor
        WHERE id = v_row.id;
        v_total_unmatched := v_total_unmatched + 1;
        CONTINUE;
      END IF;

      SELECT array_agg(sr.artist_id ORDER BY sr.invited_at, sr.id)
      INTO v_matched_ids
      FROM public.splits s
      JOIN public.split_recipients sr ON sr.split_id = s.id
      WHERE s.track_id = v_track_id
        AND s.status IN ('active', 'locked')
        AND sr.status = 'accepted'
        AND sr.artist_id IS NOT NULL;
    END IF;
$ new$;

  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Could not safely locate existing royalty split block';
  END IF;

  v_def := replace(v_def, v_old, v_new);
  -- The percentage lookup in the credit loop must use accepted recipients only.
  v_def := replace(v_def, 'sr.status <> ''declined''', 'sr.status = ''accepted''');

  EXECUTE v_def;
END
$migration$;
