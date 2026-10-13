-- Keep the release submission RPC in sync with the artist_account_id column.
-- Use pg_get_functiondef so the existing submission safeguards and track/store
-- handling remain intact while adding only the new column/value.
DO $migration$
DECLARE
  v_definition text;
  v_updated text;
BEGIN
  SELECT pg_get_functiondef(
    'public.submit_release_from_draft(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure
  ) INTO v_definition;

  v_updated := replace(
    v_definition,
    'title, artist_id, artist_name, release_date, release_type, genre, description,',
    'title, artist_id, artist_name, artist_account_id, release_date, release_type, genre, description,'
  );
  v_updated := replace(
    v_updated,
    'NULLIF(p_release->>''artist_name'', ''''),',
    'NULLIF(p_release->>''artist_name'', ''''),' || E'\n    ' || 'NULLIF(p_release->>''artist_account_id'', '''')::uuid,'
  );

  IF v_updated = v_definition OR position('artist_account_id' in v_updated) = 0 THEN
    RAISE EXCEPTION 'Could not safely patch submit_release_from_draft to persist artist_account_id';
  END IF;

  EXECUTE v_updated;
END
$migration$;
