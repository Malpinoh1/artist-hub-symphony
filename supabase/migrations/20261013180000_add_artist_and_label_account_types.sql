ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'artist';
ALTER TABLE public.artists
  DROP CONSTRAINT IF EXISTS artists_account_type_check;
ALTER TABLE public.artists
  ADD CONSTRAINT artists_account_type_check CHECK (account_type IN ('artist','label'));
ALTER TABLE public.artist_accounts
  ADD COLUMN IF NOT EXISTS signing_status text NOT NULL DEFAULT 'signed';
ALTER TABLE public.artist_accounts
  DROP CONSTRAINT IF EXISTS artist_accounts_signing_status_check;
ALTER TABLE public.artist_accounts
  ADD CONSTRAINT artist_accounts_signing_status_check CHECK (signing_status IN ('signed','pending','released'));
UPDATE public.artists
SET account_type='label'
WHERE lower(coalesce(name,'') || ' ' || coalesce(team_name,'') || ' ' || coalesce(account_name,'')) LIKE '%yls%';