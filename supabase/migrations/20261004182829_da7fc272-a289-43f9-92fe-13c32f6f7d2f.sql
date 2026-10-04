CREATE OR REPLACE FUNCTION public._purge_row_refs(p_table regclass, p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; v_nullable boolean;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS child, a.attname AS col, a.attnotnull AS notnull
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = p_table AND array_length(c.conkey,1) = 1
      AND c.conrelid <> p_table
  LOOP
    IF r.notnull THEN
      EXECUTE format('DELETE FROM %s WHERE %I = ANY($1)', r.child, r.col) USING p_ids;
    ELSE
      EXECUTE format('UPDATE %s SET %I = NULL WHERE %I = ANY($1)', r.child, r.col, r.col) USING p_ids;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public._purge_row_refs(regclass, uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._can_manage_releases()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.user_is_admin(auth.uid()) OR public.user_has_distribution_role(auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_tracks(p_track_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public._can_manage_releases() THEN
    RAISE EXCEPTION 'Administrator or distribution manager access required.' USING ERRCODE = '42501';
  END IF;
  -- incomes rows reference tracks; unlink their transactions first
  UPDATE public.income_transactions SET track_id = NULL WHERE track_id = ANY(p_track_ids);
  PERFORM public._purge_row_refs('public.tracks'::regclass, p_track_ids);
  DELETE FROM public.tracks WHERE id = ANY(p_track_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_releases(p_release_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer; v_tracks uuid[];
BEGIN
  IF NOT public._can_manage_releases() THEN
    RAISE EXCEPTION 'Administrator or distribution manager access required.' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(array_agg(id), '{}') INTO v_tracks FROM public.tracks WHERE release_id = ANY(p_release_ids);
  IF array_length(v_tracks,1) > 0 THEN
    UPDATE public.income_transactions SET track_id = NULL WHERE track_id = ANY(v_tracks);
    PERFORM public._purge_row_refs('public.tracks'::regclass, v_tracks);
    DELETE FROM public.tracks WHERE id = ANY(v_tracks);
  END IF;
  UPDATE public.release_drafts SET submitted_release_id = NULL, submission_status = 'draft', submitted_at = NULL
    WHERE submitted_release_id = ANY(p_release_ids);
  PERFORM public._purge_row_refs('public.releases'::regclass, p_release_ids);
  DELETE FROM public.releases WHERE id = ANY(p_release_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_release(p_release_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.admin_delete_releases(ARRAY[p_release_id]) > 0;
END;
$$;

REVOKE ALL ON FUNCTION public._can_manage_releases() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_tracks(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_releases(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_release(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_manage_releases() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_tracks(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_releases(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_release(uuid) TO authenticated, service_role;