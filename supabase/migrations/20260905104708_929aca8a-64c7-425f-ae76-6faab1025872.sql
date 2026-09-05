ALTER TABLE public.monthly_artist_earnings
  DROP CONSTRAINT IF EXISTS monthly_artist_earnings_artist_id_period_year_period_month__key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_earnings_unique_per_upload_v2
  ON public.monthly_artist_earnings (upload_id, artist_id, currency);