-- Enforce identifier-only royalty matching.
-- Artist names, aliases, track titles, and catalogue display names are never used
-- to infer the royalty recipient. UPC-only rows are accepted only for single-track
-- releases; multi-track releases require an ISRC to identify the track.
ALTER TABLE public.royalty_upload_rows
  ADD COLUMN IF NOT EXISTS manually_assigned boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.process_royalty_upload(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upload public.royalty_uploads;
  v_row RECORD;
  v_artist RECORD;
  v_existing RECORD;
  v_matched_ids uuid[];
  v_per_artist numeric;
  v_total_matched int := 0;
  v_total_unmatched int := 0;
  v_total_zero int := 0;
  v_safe_net numeric;
  v_track_id uuid;
  v_release_id uuid;
  v_release_artist uuid;
  v_per_downloads bigint;
  v_distributor text;
  v_split_pct numeric;
  v_candidate_count int;
  v_base_per_artist numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_upload
  FROM public.royalty_uploads
  WHERE id = p_upload_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Upload not found';
  END IF;

  v_distributor := COALESCE(v_upload.distributor_code, 'onerpm');

  -- Reverse this upload's prior wallet and monthly-earnings entries before reprocessing.
  FOR v_existing IN
    SELECT artist_id, total_earnings AS amt
    FROM public.monthly_artist_earnings
    WHERE upload_id = p_upload_id
  LOOP
    UPDATE public.artists
    SET available_balance = GREATEST(0, COALESCE(available_balance, 0) - v_existing.amt),
        total_earnings = GREATEST(0, COALESCE(total_earnings, 0) - v_existing.amt)
    WHERE id = v_existing.artist_id;
  END LOOP;

  DELETE FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id;
  DELETE FROM public.monthly_stream_stats WHERE upload_id = p_upload_id;

  FOR v_row IN
    SELECT * FROM public.royalty_upload_rows WHERE upload_id = p_upload_id
  LOOP
    v_matched_ids := '{}';
    v_track_id := NULL;
    v_release_id := NULL;
    v_release_artist := NULL;
    v_safe_net := COALESCE(v_row.net_amount, 0);

    -- Primary match: ISRC identifies one catalogue track. If UPC is also supplied,
    -- it must belong to the same release. Ambiguous or conflicting identifiers do not match.
    IF NULLIF(TRIM(v_row.isrc), '') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_candidate_count
      FROM public.release_tracks rt
      JOIN public.releases r ON r.id = rt.release_id
      JOIN public.tracks t ON t.release_track_id = rt.id AND t.release_id = rt.release_id
      WHERE regexp_replace(upper(COALESCE(rt.isrc, '')), '[^A-Z0-9]', '', 'g')
          = regexp_replace(upper(v_row.isrc), '[^A-Z0-9]', '', 'g')
        AND (
          NULLIF(TRIM(v_row.upc), '') IS NULL
          OR regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
             = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
        );

      IF v_candidate_count = 1 THEN
        SELECT t.id, rt.release_id, r.artist_id
        INTO v_track_id, v_release_id, v_release_artist
        FROM public.release_tracks rt
        JOIN public.releases r ON r.id = rt.release_id
        JOIN public.tracks t ON t.release_track_id = rt.id AND t.release_id = rt.release_id
        WHERE regexp_replace(upper(COALESCE(rt.isrc, '')), '[^A-Z0-9]', '', 'g')
            = regexp_replace(upper(v_row.isrc), '[^A-Z0-9]', '', 'g')
          AND (
            NULLIF(TRIM(v_row.upc), '') IS NULL
            OR regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
               = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
          )
        LIMIT 1;
      END IF;

      -- Legacy catalogue records may store the ISRC on releases instead of release_tracks.
      -- Accept this only when that release has exactly one track and the UPC agrees.
      IF v_release_id IS NULL THEN
        SELECT COUNT(*) INTO v_candidate_count
        FROM public.releases r
        WHERE regexp_replace(upper(COALESCE(r.isrc, '')), '[^A-Z0-9]', '', 'g')
            = regexp_replace(upper(v_row.isrc), '[^A-Z0-9]', '', 'g')
          AND (
            NULLIF(TRIM(v_row.upc), '') IS NULL
            OR regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
               = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
          )
          AND (SELECT COUNT(*) FROM public.tracks t WHERE t.release_id = r.id) = 1;

        IF v_candidate_count = 1 THEN
          SELECT r.id, r.artist_id
          INTO v_release_id, v_release_artist
          FROM public.releases r
          WHERE regexp_replace(upper(COALESCE(r.isrc, '')), '[^A-Z0-9]', '', 'g')
              = regexp_replace(upper(v_row.isrc), '[^A-Z0-9]', '', 'g')
            AND (
              NULLIF(TRIM(v_row.upc), '') IS NULL
              OR regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
                 = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
            )
            AND (SELECT COUNT(*) FROM public.tracks t WHERE t.release_id = r.id) = 1
          LIMIT 1;

          SELECT t.id INTO v_track_id
          FROM public.tracks t
          WHERE t.release_id = v_release_id
          LIMIT 1;
        END IF;
      END IF;

      IF v_release_artist IS NOT NULL THEN
        v_matched_ids := ARRAY[v_release_artist];
      END IF;
    END IF;

    -- UPC identifies a release, not a track. Without ISRC, only a single-track
    -- release can be resolved safely; multi-track releases remain unmatched.
    IF v_release_id IS NULL
       AND NULLIF(TRIM(v_row.isrc), '') IS NULL
       AND NULLIF(TRIM(v_row.upc), '') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_candidate_count
      FROM public.releases r
      WHERE regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
          = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
        AND (SELECT COUNT(*) FROM public.tracks t WHERE t.release_id = r.id) = 1;

      IF v_candidate_count = 1 THEN
        SELECT r.id, r.artist_id
        INTO v_release_id, v_release_artist
        FROM public.releases r
        WHERE regexp_replace(COALESCE(r.upc, ''), '[^0-9]', '', 'g')
            = regexp_replace(v_row.upc, '[^0-9]', '', 'g')
          AND (SELECT COUNT(*) FROM public.tracks t WHERE t.release_id = r.id) = 1
        LIMIT 1;

        SELECT t.id INTO v_track_id
        FROM public.tracks t
        WHERE t.release_id = v_release_id
        LIMIT 1;

        IF v_release_artist IS NOT NULL AND v_track_id IS NOT NULL THEN
          v_matched_ids := ARRAY[v_release_artist];
        ELSE
          v_release_id := NULL;
          v_track_id := NULL;
          v_release_artist := NULL;
        END IF;
      END IF;
    END IF;

    -- Deliberate admin assignment is allowed as a manual exception. Old automatic
    -- name-based matches are not trusted because manually_assigned defaults to false.
    IF COALESCE(array_length(v_matched_ids, 1), 0) = 0
       AND COALESCE(v_row.manually_assigned, false)
       AND COALESCE(array_length(v_row.matched_artist_ids, 1), 0) > 0
       AND v_row.match_status = 'matched' THEN
      v_matched_ids := v_row.matched_artist_ids;
    END IF;

    IF v_safe_net = 0 AND COALESCE(v_row.quantity, 0) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = COALESCE(v_matched_ids, '{}'),
          match_status = 'zero_revenue',
          assigned_amount_per_artist = 0,
          distributor_code = v_distributor
      WHERE id = v_row.id;
      v_total_zero := v_total_zero + 1;
      CONTINUE;
    END IF;

    IF COALESCE(array_length(v_matched_ids, 1), 0) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = '{}',
          match_status = 'unmatched',
          assigned_amount_per_artist = 0,
          distributor_code = v_distributor
      WHERE id = v_row.id;
      v_total_unmatched := v_total_unmatched + 1;
      CONTINUE;
    END IF;

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

    v_base_per_artist := ROUND(v_safe_net / array_length(v_matched_ids, 1), 4);
    v_per_artist := v_base_per_artist;
    v_per_downloads := FLOOR(COALESCE(v_row.downloads, 0)::numeric / array_length(v_matched_ids, 1));

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids,
        match_status = 'matched',
        assigned_amount_per_artist = v_per_artist,
        distributor_code = v_distributor
    WHERE id = v_row.id;

    v_total_matched := v_total_matched + 1;

    FOR v_artist IN SELECT unnest(v_matched_ids) AS id
    LOOP
      v_per_artist := v_base_per_artist;
      v_split_pct := NULL;

      IF v_track_id IS NOT NULL THEN
        SELECT sr.percentage INTO v_split_pct
        FROM public.splits s
        JOIN public.split_recipients sr ON sr.split_id = s.id
        WHERE s.track_id = v_track_id
          AND s.status IN ('active', 'locked')
          AND sr.artist_id = v_artist.id
          AND sr.status <> 'declined'
        ORDER BY sr.invited_at
        LIMIT 1;
      END IF;

      IF v_split_pct IS NOT NULL THEN
        v_per_artist := ROUND(v_safe_net * v_split_pct / 100, 4);
      END IF;

      INSERT INTO public.monthly_artist_earnings
        (artist_id, account_name, period_year, period_month, total_streams, total_earnings, currency, upload_id)
      VALUES (
        v_artist.id,
        (SELECT account_name FROM public.artists WHERE id = v_artist.id),
        v_upload.period_year,
        v_upload.period_month,
        CASE WHEN lower(COALESCE(v_row.sales_type, '')) LIKE '%share out%'
             THEN 0 ELSE COALESCE(v_row.quantity, 0) END,
        v_per_artist,
        v_row.currency,
        p_upload_id
      )
      ON CONFLICT (upload_id, artist_id, currency) DO UPDATE SET
        total_streams = public.monthly_artist_earnings.total_streams + EXCLUDED.total_streams,
        total_earnings = public.monthly_artist_earnings.total_earnings + EXCLUDED.total_earnings,
        updated_at = now();

      UPDATE public.artists
      SET available_balance = COALESCE(available_balance, 0) + v_per_artist,
          total_earnings = COALESCE(total_earnings, 0) + v_per_artist
      WHERE id = v_artist.id;

      INSERT INTO public.monthly_stream_stats
        (artist_id, release_id, track_id, upload_id, period_year, period_month,
         track_title, dsp_name, country, streams, downloads, quantity, revenue, currency, distributor_code)
      VALUES (
        v_artist.id,
        v_release_id,
        v_track_id,
        p_upload_id,
        v_upload.period_year,
        v_upload.period_month,
        v_row.track_title,
        v_row.dsp_name,
        v_row.country,
        CASE WHEN lower(COALESCE(v_row.sales_type, '')) LIKE '%share out%'
             THEN 0 ELSE COALESCE(v_row.quantity, 0) END,
        v_per_downloads,
        CASE WHEN lower(COALESCE(v_row.sales_type, '')) LIKE '%share out%'
             THEN 0 ELSE COALESCE(v_row.quantity, 0) END,
        v_per_artist,
        v_row.currency,
        v_distributor
      );
    END LOOP;
  END LOOP;

  UPDATE public.royalty_uploads
  SET matched_rows = v_total_matched,
      unmatched_rows = v_total_unmatched,
      status = 'completed',
      updated_at = now()
  WHERE id = p_upload_id;

  PERFORM public.award_stream_achievements();

  RETURN jsonb_build_object(
    'matched', v_total_matched,
    'unmatched', v_total_unmatched,
    'zero_revenue', v_total_zero,
    'distributor', v_distributor
  );
END
$function$;

REVOKE ALL ON FUNCTION public.process_royalty_upload(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_royalty_upload(uuid) TO authenticated, service_role;
