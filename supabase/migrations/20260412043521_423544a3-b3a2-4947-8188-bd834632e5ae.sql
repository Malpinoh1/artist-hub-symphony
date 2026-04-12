
-- Add release_id to royalty_splits
ALTER TABLE public.royalty_splits 
ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id);

-- Create split_invitations table
CREATE TABLE public.split_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid REFERENCES public.royalty_splits(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) NOT NULL,
  release_id uuid REFERENCES public.releases(id),
  invited_email text NOT NULL,
  percentage numeric NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  role text DEFAULT 'collaborator',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- Enable RLS
ALTER TABLE public.split_invitations ENABLE ROW LEVEL SECURITY;

-- Artists can view invitations they created
CREATE POLICY "Artists can view own invitations"
ON public.split_invitations
FOR SELECT
USING (invited_by = auth.uid());

-- Artists can create invitations for their own tracks
CREATE POLICY "Artists can create invitations for own tracks"
ON public.split_invitations
FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tracks WHERE id = track_id AND primary_artist_id = auth.uid()
  )
);

-- Invited users can view their invitations (by email match)
CREATE POLICY "Invited users can view their invitations"
ON public.split_invitations
FOR SELECT
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Invited users can update their invitation status (accept/decline)
CREATE POLICY "Invited users can accept or decline"
ON public.split_invitations
FOR UPDATE
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

-- Admins can do everything
CREATE POLICY "Admins full access to split_invitations"
ON public.split_invitations
FOR ALL
USING (public.user_is_admin(auth.uid()));

-- Public read for token-based lookup (for accept-split page before login)
CREATE POLICY "Public can read by token"
ON public.split_invitations
FOR SELECT
USING (true);

-- Add index for token lookups
CREATE INDEX idx_split_invitations_token ON public.split_invitations(token);
CREATE INDEX idx_split_invitations_track ON public.split_invitations(track_id);
CREATE INDEX idx_split_invitations_invited_email ON public.split_invitations(invited_email);

-- Update RLS on royalty_splits to allow release_id
-- (existing policies already handle the table)
