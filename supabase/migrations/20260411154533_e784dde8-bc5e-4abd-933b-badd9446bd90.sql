
-- Add approval workflow columns to royalty_splits
ALTER TABLE public.royalty_splits 
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN created_by uuid,
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- Set existing splits as approved (they were created by admins)
UPDATE public.royalty_splits SET status = 'approved' WHERE status = 'pending';

-- Drop existing artist view policy and add broader ones
DROP POLICY IF EXISTS "Artists can view their royalty splits" ON public.royalty_splits;

-- Artists can create splits for tracks they own
CREATE POLICY "Artists can create splits for own tracks"
ON public.royalty_splits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tracks t WHERE t.id = track_id AND t.primary_artist_id = auth.uid()
  )
  AND status = 'pending'
  AND created_by = auth.uid()
);

-- Artists can update their own pending splits
CREATE POLICY "Artists can update own pending splits"
ON public.royalty_splits FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() AND status = 'pending'
)
WITH CHECK (
  created_by = auth.uid() AND status = 'pending'
);

-- Artists can delete their own pending splits
CREATE POLICY "Artists can delete own pending splits"
ON public.royalty_splits FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() AND status = 'pending'
);

-- Artists can view splits where they are involved (as creator or recipient)
CREATE POLICY "Artists can view relevant splits"
ON public.royalty_splits FOR SELECT
TO authenticated
USING (
  artist_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND t.primary_artist_id = auth.uid())
  OR user_is_admin()
);

-- Update validate_royalty_splits_total trigger to only count approved + pending splits
CREATE OR REPLACE FUNCTION public.validate_royalty_splits_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- Count existing non-rejected splits for the same track (excluding self on update)
  SELECT COALESCE(SUM(percentage), 0) INTO v_total
  FROM royalty_splits
  WHERE track_id = NEW.track_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status != 'rejected';

  v_total := v_total + NEW.percentage;

  IF v_total > 100 THEN
    RAISE EXCEPTION 'Total royalty splits would exceed 100';
  END IF;

  RETURN NEW;
END;
$$;

-- Update process_income to only use APPROVED splits
CREATE OR REPLACE FUNCTION public.process_income(
  p_track_id uuid,
  p_platform_id uuid,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_income_id uuid;
  v_track_owner uuid;
  v_split RECORD;
  v_has_splits boolean;
  v_share_amount numeric;
  v_artist_balance numeric;
  v_total_split_pct numeric;
BEGIN
  IF NOT user_is_admin(p_created_by) THEN
    RAISE EXCEPTION 'Only admins can add income';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT primary_artist_id INTO v_track_owner
  FROM tracks WHERE id = p_track_id;
  IF v_track_owner IS NULL THEN
    RAISE EXCEPTION 'Track not found';
  END IF;

  IF p_reference IS NOT NULL AND EXISTS (SELECT 1 FROM incomes WHERE reference = p_reference) THEN
    RAISE EXCEPTION 'Duplicate reference';
  END IF;

  INSERT INTO incomes (track_id, platform_id, amount, description, reference, date, created_by, workflow_status)
  VALUES (p_track_id, p_platform_id, p_amount, p_description, p_reference, p_date, p_created_by, 'draft')
  RETURNING id INTO v_income_id;

  -- Only use APPROVED splits
  SELECT COALESCE(SUM(percentage), 0) INTO v_total_split_pct
  FROM royalty_splits WHERE track_id = p_track_id AND status = 'approved';

  v_has_splits := v_total_split_pct > 0;

  IF v_has_splits THEN
    IF v_total_split_pct != 100 THEN
      UPDATE incomes SET workflow_status = 'failed' WHERE id = v_income_id;
      RAISE EXCEPTION 'Approved royalty splits do not sum to 100';
    END IF;

    FOR v_split IN SELECT rs.artist_id, rs.percentage FROM royalty_splits rs WHERE rs.track_id = p_track_id AND rs.status = 'approved' LOOP
      v_share_amount := ROUND(p_amount * v_split.percentage / 100, 2);

      UPDATE artists SET
        available_balance = COALESCE(available_balance, 0) + v_share_amount,
        total_earnings = COALESCE(total_earnings, 0) + v_share_amount
      WHERE id = v_split.artist_id;

      SELECT COALESCE(available_balance, 0) INTO v_artist_balance FROM artists WHERE id = v_split.artist_id;

      IF v_split.artist_id = v_track_owner THEN
        INSERT INTO income_transactions (artist_id, track_id, platform_id, income_id, type, amount, balance_after, description)
        VALUES (v_split.artist_id, p_track_id, p_platform_id, v_income_id, 'income', v_share_amount, v_artist_balance,
                COALESCE(p_description, 'Income from track'));
      ELSE
        INSERT INTO income_transactions (artist_id, track_id, platform_id, income_id, type, amount, balance_after, description)
        VALUES (v_split.artist_id, p_track_id, p_platform_id, v_income_id, 'royalty_share_in', v_share_amount, v_artist_balance,
                concat('Royalty share: ', v_split.percentage, ' pct'));
      END IF;
    END LOOP;
  ELSE
    v_share_amount := p_amount;

    UPDATE artists SET
      available_balance = COALESCE(available_balance, 0) + v_share_amount,
      total_earnings = COALESCE(total_earnings, 0) + v_share_amount
    WHERE id = v_track_owner;

    SELECT COALESCE(available_balance, 0) INTO v_artist_balance FROM artists WHERE id = v_track_owner;

    INSERT INTO income_transactions (artist_id, track_id, platform_id, income_id, type, amount, balance_after, description)
    VALUES (v_track_owner, p_track_id, p_platform_id, v_income_id, 'income', v_share_amount, v_artist_balance,
            COALESCE(p_description, 'Income from track'));
  END IF;

  UPDATE incomes SET workflow_status = 'processed' WHERE id = v_income_id;

  RETURN v_income_id;
END;
$$;
