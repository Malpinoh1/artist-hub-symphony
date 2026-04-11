
-- Add workflow_status column
ALTER TABLE public.incomes ADD COLUMN workflow_status text NOT NULL DEFAULT 'draft';

-- Update process_income to track workflow status
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

  -- Insert income record (starts as draft)
  INSERT INTO incomes (track_id, platform_id, amount, description, reference, date, created_by, workflow_status)
  VALUES (p_track_id, p_platform_id, p_amount, p_description, p_reference, p_date, p_created_by, 'draft')
  RETURNING id INTO v_income_id;

  -- Validate and process splits
  SELECT COALESCE(SUM(percentage), 0) INTO v_total_split_pct
  FROM royalty_splits WHERE track_id = p_track_id;

  v_has_splits := v_total_split_pct > 0;

  IF v_has_splits THEN
    IF v_total_split_pct != 100 THEN
      UPDATE incomes SET workflow_status = 'failed' WHERE id = v_income_id;
      RAISE EXCEPTION 'Royalty splits do not sum to 100';
    END IF;

    FOR v_split IN SELECT rs.artist_id, rs.percentage FROM royalty_splits rs WHERE rs.track_id = p_track_id LOOP
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

  -- Mark as processed on success
  UPDATE incomes SET workflow_status = 'processed' WHERE id = v_income_id;

  RETURN v_income_id;
END;
$$;
