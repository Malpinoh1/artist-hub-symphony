CREATE TABLE IF NOT EXISTS public.release_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_art_url text,
  audio_file_urls text[] NOT NULL DEFAULT '{}',
  current_step integer NOT NULL DEFAULT 1,
  selected_artist_account text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_drafts_user ON public.release_drafts(user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_drafts TO authenticated;
GRANT ALL ON public.release_drafts TO service_role;

ALTER TABLE public.release_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own release drafts"
  ON public.release_drafts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_release_drafts_updated_at ON public.release_drafts;
CREATE TRIGGER trg_release_drafts_updated_at
BEFORE UPDATE ON public.release_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();