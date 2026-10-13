-- Persist the exact signed artist selected when a label submits a release.
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS artist_account_id uuid
  REFERENCES public.artist_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_releases_artist_account_id
  ON public.releases(artist_account_id);
