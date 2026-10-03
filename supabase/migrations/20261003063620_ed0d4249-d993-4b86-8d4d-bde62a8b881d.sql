ALTER TABLE public.release_drafts
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS release_drafts_submitted_release_unique
  ON public.release_drafts(submitted_release_id)
  WHERE submitted_release_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_release_from_draft(
  p_draft_id uuid,
  p_release jsonb,
  p_tracks jsonb DEFAULT '[]'::jsonb,
  p_stores jsonb DEFAULT '[]'::jsonb,
  p_audio_clips jsonb DEFAULT '[]'::jsonb,
  p_free_track_numbers jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_draft public.release_drafts%ROWTYPE;
  v_release_id uuid;
  v_release_track_id uuid;
  v_track jsonb;
  v_store jsonb;
  v_clip jsonb;
  v_track_number integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_draft
  FROM public.release_drafts
  WHERE id = p_draft_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release draft not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_draft.submitted_release_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'release_id', v_draft.submitted_release_id,
      'duplicate_prevented', true
    );
  END IF;

  IF COALESCE(p_release->>'artist_id', '') <> v_user_id::text THEN
    RAISE EXCEPTION 'Release owner does not match the signed-in user.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.release_drafts
  SET submission_status = 'submitting'
  WHERE id = p_draft_id;

  INSERT INTO public.releases (
    title, artist_id, artist_name, release_date, release_type, genre, description,
    primary_language, explicit_content, producer_credits, songwriter_credits,
    artwork_credits, copyright_info, submission_notes, total_tracks, status,
    cover_art_url, platforms, audio_file_url, upc, territory, release_time,
    release_timezone, pre_order_enabled, pre_order_previews, pricing
  ) VALUES (
    p_release->>'title',
    v_user_id,
    NULLIF(p_release->>'artist_name', ''),
    (p_release->>'release_date')::date,
    COALESCE(NULLIF(p_release->>'release_type', ''), 'single'),
    NULLIF(p_release->>'genre', ''),
    NULLIF(p_release->>'description', ''),
    COALESCE(NULLIF(p_release->>'primary_language', ''), 'English'),
    COALESCE((p_release->>'explicit_content')::boolean, false),
    NULLIF(p_release->>'producer_credits', ''),
    NULLIF(p_release->>'songwriter_credits', ''),
    NULLIF(p_release->>'artwork_credits', ''),
    NULLIF(p_release->>'copyright_info', ''),
    NULLIF(p_release->>'submission_notes', ''),
    COALESCE(jsonb_array_length(p_tracks), 0),
    'Pending'::public.release_status,
    NULLIF(p_release->>'cover_art_url', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_release->'platforms', '[]'::jsonb))), ARRAY[]::text[]),
    NULLIF(p_release->>'audio_file_url', ''),
    NULLIF(p_release->>'upc', ''),
    COALESCE(NULLIF(p_release->>'territory', ''), 'World'),
    NULLIF(p_release->>'release_time', ''),
    NULLIF(p_release->>'release_timezone', ''),
    COALESCE((p_release->>'pre_order_enabled')::boolean, false),
    COALESCE((p_release->>'pre_order_previews')::boolean, false),
    COALESCE(NULLIF(p_release->>'pricing', ''), 'standard')
  ) RETURNING id INTO v_release_id;

  FOR v_track IN SELECT value FROM jsonb_array_elements(COALESCE(p_tracks, '[]'::jsonb))
  LOOP
    v_track_number := COALESCE((v_track->>'track_number')::integer, 1);

    INSERT INTO public.release_tracks (
      release_id, track_number, title, duration, isrc, explicit_content, featured_artists
    ) VALUES (
      v_release_id,
      v_track_number,
      v_track->>'title',
      NULLIF(v_track->>'duration', '')::integer,
      NULLIF(v_track->>'isrc', ''),
      COALESCE((v_track->>'explicit_content')::boolean, false),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_track->'featured_artists', '[]'::jsonb))), ARRAY[]::text[])
    ) RETURNING id INTO v_release_track_id;

    INSERT INTO public.tracks (title, primary_artist_id, release_id, release_track_id)
    VALUES (v_track->>'title', v_user_id, v_release_id, v_release_track_id);
  END LOOP;

  FOR v_store IN SELECT value FROM jsonb_array_elements(COALESCE(p_stores, '[]'::jsonb))
  LOOP
    INSERT INTO public.release_store_selections (
      release_id, store_name, store_category, enabled, status
    ) VALUES (
      v_release_id,
      v_store->>'store_name',
      COALESCE(NULLIF(v_store->>'store_category', ''), 'essential'),
      COALESCE((v_store->>'enabled')::boolean, false),
      COALESCE(NULLIF(v_store->>'status', ''), 'pending')
    );
  END LOOP;

  FOR v_clip IN SELECT value FROM jsonb_array_elements(COALESCE(p_audio_clips, '[]'::jsonb))
  LOOP
    SELECT id INTO v_release_track_id
    FROM public.release_tracks
    WHERE release_id = v_release_id
      AND track_number = (v_clip->>'track_number')::integer;

    IF v_release_track_id IS NOT NULL THEN
      INSERT INTO public.release_audio_clips (
        release_id, track_id, clip_start, clip_end, clip_type
      ) VALUES (
        v_release_id,
        v_release_track_id,
        COALESCE((v_clip->>'clip_start')::integer, 0),
        COALESCE((v_clip->>'clip_end')::integer, 30),
        COALESCE(NULLIF(v_clip->>'clip_type', ''), 'ringtone')
      );
    END IF;
  END LOOP;

  FOR v_track_number IN SELECT value::text::integer FROM jsonb_array_elements(COALESCE(p_free_track_numbers, '[]'::jsonb))
  LOOP
    SELECT id INTO v_release_track_id
    FROM public.release_tracks
    WHERE release_id = v_release_id AND track_number = v_track_number;

    IF v_release_track_id IS NOT NULL THEN
      INSERT INTO public.release_free_tracks (release_id, track_id)
      VALUES (v_release_id, v_release_track_id);
    END IF;
  END LOOP;

  UPDATE public.release_drafts
  SET submission_status = 'submitted',
      submitted_release_id = v_release_id,
      submitted_at = now()
  WHERE id = p_draft_id;

  RETURN jsonb_build_object('release_id', v_release_id, 'duplicate_prevented', false);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_release(p_release_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Administrator access required.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.releases WHERE id = p_release_id) THEN
    RETURN false;
  END IF;

  UPDATE public.income_transactions
  SET track_id = NULL
  WHERE track_id IN (SELECT id FROM public.tracks WHERE release_id = p_release_id);

  UPDATE public.monthly_stream_stats
  SET track_id = NULL, release_id = NULL
  WHERE release_id = p_release_id
     OR track_id IN (SELECT id FROM public.tracks WHERE release_id = p_release_id);

  DELETE FROM public.incomes
  WHERE track_id IN (SELECT id FROM public.tracks WHERE release_id = p_release_id);

  DELETE FROM public.split_invitations
  WHERE release_id = p_release_id
     OR track_id IN (SELECT id FROM public.tracks WHERE release_id = p_release_id);

  DELETE FROM public.royalty_splits
  WHERE release_id = p_release_id
     OR track_id IN (SELECT id FROM public.tracks WHERE release_id = p_release_id);

  DELETE FROM public.tracks WHERE release_id = p_release_id;

  UPDATE public.release_drafts
  SET submitted_release_id = NULL,
      submission_status = 'draft',
      submitted_at = NULL
  WHERE submitted_release_id = p_release_id;

  DELETE FROM public.releases WHERE id = p_release_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_release(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_release(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_release(uuid) TO service_role;