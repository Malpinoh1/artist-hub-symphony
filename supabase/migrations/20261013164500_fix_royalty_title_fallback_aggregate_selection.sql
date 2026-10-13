-- Ensure the dynamic royalty title fallback selects aggregate values when
-- validating that exactly one candidate exists.
DO $$
DECLARE v_def text;
BEGIN
 v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);
 v_def := replace(v_def,
   '        SELECT cr.release_id INTO v_release_id
        FROM candidate_releases cr
        HAVING count(*) = 1;',
   '        SELECT (array_agg(cr.release_id))[1] INTO v_release_id
        FROM candidate_releases cr
        HAVING count(*) = 1;');
 v_def := replace(v_def,
   '          SELECT t.id INTO v_track_id
          FROM public.tracks t
          WHERE t.release_id = v_release_id
            AND lower(trim(t.title)) = lower(trim(v_row.track_title))
          HAVING count(*) = 1;',
   '          SELECT (array_agg(t.id))[1] INTO v_track_id
          FROM public.tracks t
          WHERE t.release_id = v_release_id
            AND lower(trim(t.title)) = lower(trim(v_row.track_title))
          HAVING count(*) = 1;');
 EXECUTE v_def;
END $$;
