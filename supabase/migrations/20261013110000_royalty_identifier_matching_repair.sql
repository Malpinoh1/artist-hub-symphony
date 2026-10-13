-- Normalize royalty identifiers and preserve release links when no track row exists.
-- Keep this patch dynamic so it upgrades the existing process_royalty_upload definition.
DO $migration$
DECLARE
  v_def text;
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);

  IF position('SELECT rt.id, rt.release_id, r.artist_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'Could not locate ISRC track-match SELECT';
  END IF;
  v_def := replace(v_def, 'SELECT rt.id, rt.release_id, r.artist_id', 'SELECT t.id, rt.release_id, r.artist_id');
  v_def := replace(v_def,
    'JOIN public.releases r ON r.id = rt.release_id' || chr(10) || '      WHERE upper(rt.isrc) = upper(trim(v_row.isrc))',
    'JOIN public.releases r ON r.id = rt.release_id' || chr(10) ||
    '      LEFT JOIN public.tracks t ON t.release_track_id = rt.id AND t.release_id = rt.release_id' || chr(10) ||
    '      WHERE regexp_replace(upper(coalesce(rt.isrc, '''')), ''[^A-Z0-9]'', '''', ''g'') = regexp_replace(upper(coalesce(v_row.isrc, '''')), ''[^A-Z0-9]'', '''', ''g'')'
  );
  v_def := replace(v_def,
    'upper(isrc) = upper(trim(v_row.isrc))',
    'regexp_replace(upper(coalesce(isrc, '''')), ''[^A-Z0-9]'', '''', ''g'') = regexp_replace(upper(coalesce(v_row.isrc, '''')), ''[^A-Z0-9]'', '''', ''g'')'
  );
  v_def := replace(v_def,
    'WHERE r.upc = trim(v_row.upc)',
    'WHERE regexp_replace(coalesce(r.upc, ''''), ''[^0-9]'', '''', ''g'') = regexp_replace(coalesce(v_row.upc, ''''), ''[^0-9]'', '''', ''g'')'
  );
  v_def := replace(v_def,
    'SELECT rt.id INTO v_track_id' || chr(10) ||
    '          FROM public.release_tracks rt',
    'SELECT t.id INTO v_track_id' || chr(10) ||
    '          FROM public.release_tracks rt LEFT JOIN public.tracks t ON t.release_track_id = rt.id AND t.release_id = rt.release_id'
  );
  v_def := replace(v_def,
    'IF v_track_id IS NULL AND v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN',
    'IF v_track_id IS NULL AND v_release_id IS NULL AND v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN'
  );

  IF position('regexp_replace(coalesce(r.upc' in v_def) = 0
     OR position('v_release_id IS NULL AND v_row.track_title' in v_def) = 0
     OR position('LEFT JOIN public.tracks t ON t.release_track_id' in v_def) = 0 THEN
    RAISE EXCEPTION 'Matching function patch verification failed; no function changed';
  END IF;
  EXECUTE v_def;
END
$migration$;

-- A null auth.uid() is allowed only for trusted database/service-role maintenance calls.
-- Public/anonymous callers cannot execute this function; authenticated calls still require admin role.
DO $migration$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);
  IF position('IF NOT public.user_is_admin() THEN RAISE EXCEPTION ''Admin only''; END IF;' in v_def) > 0 THEN
    v_def := replace(v_def,
      'IF NOT public.user_is_admin() THEN RAISE EXCEPTION ''Admin only''; END IF;',
      'IF auth.uid() IS NOT NULL AND NOT public.user_is_admin(auth.uid()) THEN RAISE EXCEPTION ''Admin only''; END IF;'
    );
  END IF;
  EXECUTE v_def;
END
$migration$;

REVOKE ALL ON FUNCTION public.process_royalty_upload(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_royalty_upload(uuid) TO authenticated, service_role;

-- Safe historical backfill: only link rows where title + artist resolves to exactly one release.
WITH candidates AS (
  SELECT m.id AS stats_id, r.id AS release_id
  FROM public.monthly_stream_stats m
  JOIN public.releases r ON r.artist_id = m.artist_id
   AND lower(regexp_replace(trim(coalesce(r.title,'')), '\\s+', ' ', 'g')) =
       lower(regexp_replace(trim(coalesce(m.track_title,'')), '\\s+', ' ', 'g'))
  WHERE m.release_id IS NULL AND nullif(trim(m.track_title),'') IS NOT NULL
  UNION
  SELECT m.id, r.id
  FROM public.monthly_stream_stats m
  JOIN public.release_tracks rt
   ON lower(regexp_replace(trim(coalesce(rt.title,'')), '\\s+', ' ', 'g')) =
      lower(regexp_replace(trim(coalesce(m.track_title,'')), '\\s+', ' ', 'g'))
  JOIN public.releases r ON r.id = rt.release_id AND r.artist_id = m.artist_id
  WHERE m.release_id IS NULL AND nullif(trim(m.track_title),'') IS NOT NULL
),
unique_candidates AS (
  SELECT stats_id, min(release_id::text)::uuid AS release_id
  FROM candidates GROUP BY stats_id HAVING count(DISTINCT release_id) = 1
)
UPDATE public.monthly_stream_stats m SET release_id = u.release_id
FROM unique_candidates u WHERE m.id = u.stats_id AND m.release_id IS NULL;

-- Additional safe identifier backfill for statement rows with a unique release match.
WITH source_candidates AS (
  SELECT m.id AS stats_id, rel.id AS release_id
  FROM public.monthly_stream_stats m
  JOIN public.royalty_upload_rows rr
    ON rr.upload_id = m.upload_id AND m.artist_id = ANY(rr.matched_artist_ids)
   AND lower(trim(coalesce(m.track_title,''))) = lower(trim(coalesce(rr.track_title,'')))
   AND coalesce(m.dsp_name,'') = coalesce(rr.dsp_name,'')
   AND coalesce(m.country,'') = coalesce(rr.country,'')
   AND m.streams = rr.quantity AND m.revenue = rr.assigned_amount_per_artist
  JOIN public.releases rel ON rel.artist_id = m.artist_id
   AND (regexp_replace(upper(coalesce(rel.isrc,'')), '[^A-Z0-9]', '', 'g') =
        regexp_replace(upper(coalesce(rr.isrc,'')), '[^A-Z0-9]', '', 'g')
     OR regexp_replace(coalesce(rel.upc,''), '[^0-9]', '', 'g') =
        regexp_replace(coalesce(rr.upc,''), '[^0-9]', '', 'g'))
  WHERE m.release_id IS NULL AND (nullif(trim(rr.isrc),'') IS NOT NULL OR nullif(trim(rr.upc),'') IS NOT NULL)
  UNION
  SELECT m.id, rel.id
  FROM public.monthly_stream_stats m
  JOIN public.royalty_upload_rows rr
    ON rr.upload_id = m.upload_id AND m.artist_id = ANY(rr.matched_artist_ids)
   AND lower(trim(coalesce(m.track_title,''))) = lower(trim(coalesce(rr.track_title,'')))
   AND coalesce(m.dsp_name,'') = coalesce(rr.dsp_name,'')
   AND coalesce(m.country,'') = coalesce(rr.country,'')
   AND m.streams = rr.quantity AND m.revenue = rr.assigned_amount_per_artist
  JOIN public.release_tracks rt
    ON regexp_replace(upper(coalesce(rt.isrc,'')), '[^A-Z0-9]', '', 'g') =
       regexp_replace(upper(coalesce(rr.isrc,'')), '[^A-Z0-9]', '', 'g')
  JOIN public.releases rel ON rel.id = rt.release_id AND rel.artist_id = m.artist_id
  WHERE m.release_id IS NULL AND nullif(trim(rr.isrc),'') IS NOT NULL
),
unique_candidates AS (
  SELECT stats_id, min(release_id::text)::uuid AS release_id
  FROM source_candidates GROUP BY stats_id HAVING count(DISTINCT release_id) = 1
)
UPDATE public.monthly_stream_stats m SET release_id = u.release_id
FROM unique_candidates u WHERE m.id = u.stats_id AND m.release_id IS NULL;
