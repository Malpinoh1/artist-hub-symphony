
-- Clean up any partial state
DROP FUNCTION IF EXISTS public.process_income CASCADE;
DROP FUNCTION IF EXISTS public.validate_royalty_splits_total CASCADE;
DROP TABLE IF EXISTS public.income_transactions CASCADE;
DROP TABLE IF EXISTS public.incomes CASCADE;
DROP TABLE IF EXISTS public.royalty_splits CASCADE;
DROP TABLE IF EXISTS public.income_platforms CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;

-- Table: tracks
CREATE TABLE public.tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  primary_artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all tracks" ON public.tracks FOR ALL USING (user_is_admin());

-- Table: income_platforms
CREATE TABLE public.income_platforms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE
);
ALTER TABLE public.income_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view platforms" ON public.income_platforms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage platforms" ON public.income_platforms FOR ALL USING (user_is_admin());

INSERT INTO public.income_platforms (name) VALUES
  ('Spotify'), ('Apple Music'), ('Audiomack'), ('Boomplay'),
  ('YouTube Music'), ('TikTok'), ('Facebook / Instagram'), ('Manual');

-- Table: royalty_splits
CREATE TABLE public.royalty_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  percentage numeric NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  UNIQUE (track_id, artist_id)
);
ALTER TABLE public.royalty_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all royalty splits" ON public.royalty_splits FOR ALL USING (user_is_admin());
CREATE POLICY "Artists can view their royalty splits" ON public.royalty_splits FOR SELECT USING (artist_id = auth.uid());

-- Tracks policy that references royalty_splits (must come after royalty_splits table)
CREATE POLICY "Artists can view their tracks" ON public.tracks FOR SELECT USING (
  primary_artist_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.royalty_splits rs WHERE rs.track_id = tracks.id AND rs.artist_id = auth.uid()
  )
);

-- Table: incomes
CREATE TABLE public.incomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE RESTRICT,
  platform_id uuid NOT NULL REFERENCES public.income_platforms(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  reference text UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all incomes" ON public.incomes FOR ALL USING (user_is_admin());
CREATE POLICY "Artists can view incomes for their tracks" ON public.incomes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tracks t WHERE t.id = incomes.track_id AND (
      t.primary_artist_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.royalty_splits rs WHERE rs.track_id = t.id AND rs.artist_id = auth.uid()
      )
    )
  )
);

-- Table: income_transactions
CREATE TABLE public.income_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  platform_id uuid REFERENCES public.income_platforms(id) ON DELETE SET NULL,
  income_id uuid REFERENCES public.incomes(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('income', 'royalty_share_in', 'royalty_share_out', 'withdrawal')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.income_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all income transactions" ON public.income_transactions FOR ALL USING (user_is_admin());
CREATE POLICY "Artists can view their income transactions" ON public.income_transactions FOR SELECT USING (artist_id = auth.uid());

CREATE INDEX idx_income_transactions_artist ON public.income_transactions(artist_id);
CREATE INDEX idx_income_transactions_track ON public.income_transactions(track_id);
CREATE INDEX idx_income_transactions_type ON public.income_transactions(type);
CREATE INDEX idx_royalty_splits_track ON public.royalty_splits(track_id);
CREATE INDEX idx_incomes_track ON public.incomes(track_id);

-- Function: process_income (atomic income distribution with royalty splits)
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
SET search_path = public
AS $fn$
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

  INSERT INTO incomes (track_id, platform_id, amount, description, reference, date, created_by)
  VALUES (p_track_id, p_platform_id, p_amount, p_description, p_reference, p_date, p_created_by)
  RETURNING id INTO v_income_id;

  SELECT COALESCE(SUM(percentage), 0) INTO v_total_split_pct
  FROM royalty_splits WHERE track_id = p_track_id;

  v_has_splits := v_total_split_pct > 0;

  IF v_has_splits THEN
    IF v_total_split_pct != 100 THEN
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

  RETURN v_income_id;
END;
$fn$;

-- Trigger: validate royalty splits total per track
CREATE OR REPLACE FUNCTION public.validate_royalty_splits_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(percentage), 0) INTO v_total
  FROM royalty_splits
  WHERE track_id = NEW.track_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_total := v_total + NEW.percentage;

  IF v_total > 100 THEN
    RAISE EXCEPTION 'Total royalty splits would exceed 100';
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_validate_royalty_splits
BEFORE INSERT OR UPDATE ON public.royalty_splits
FOR EACH ROW
EXECUTE FUNCTION public.validate_royalty_splits_total();
