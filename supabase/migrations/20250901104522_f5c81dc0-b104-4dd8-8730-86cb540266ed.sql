-- Add release type and edit request functionality (fixed status values)
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS release_type TEXT DEFAULT 'single' CHECK (release_type IN ('single', 'ep', 'album')),
ADD COLUMN IF NOT EXISTS genre TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS artwork_credits TEXT,
ADD COLUMN IF NOT EXISTS producer_credits TEXT,
ADD COLUMN IF NOT EXISTS songwriter_credits TEXT,
ADD COLUMN IF NOT EXISTS total_tracks INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS explicit_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS copyright_info TEXT,
ADD COLUMN IF NOT EXISTS submission_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create edit requests table
CREATE TABLE IF NOT EXISTS public.release_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'edit' CHECK (request_type IN ('edit', 'correction')),
  requested_changes JSONB NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID
);

-- Enable RLS on edit requests
ALTER TABLE public.release_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policies for edit requests
CREATE POLICY "Artists can create edit requests for their releases"
ON public.release_edit_requests
FOR INSERT
WITH CHECK (
  auth.uid() = artist_id AND 
  EXISTS (
    SELECT 1 FROM public.releases 
    WHERE id = release_id AND artist_id = auth.uid()
  )
);

CREATE POLICY "Artists can view their own edit requests"
ON public.release_edit_requests
FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Admins can manage all edit requests"
ON public.release_edit_requests
FOR ALL
USING (public.user_is_admin());

-- Update trigger for releases
CREATE OR REPLACE TRIGGER update_releases_updated_at
BEFORE UPDATE ON public.releases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for edit requests
CREATE TRIGGER update_release_edit_requests_updated_at
BEFORE UPDATE ON public.release_edit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create tracks table for album/EP support
CREATE TABLE IF NOT EXISTS public.release_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  track_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER, -- in seconds
  isrc TEXT,
  explicit_content BOOLEAN DEFAULT false,
  featured_artists TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(release_id, track_number)
);

-- Enable RLS on tracks
ALTER TABLE public.release_tracks ENABLE ROW LEVEL SECURITY;

-- Policies for tracks
CREATE POLICY "Artists can manage tracks for their releases"
ON public.release_tracks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.releases 
    WHERE id = release_id AND 
    (user_is_admin() OR (user_has_active_subscription() AND has_account_access(artist_id, 'manager'::account_role)))
  )
);

-- Update releases policies to allow updates for pending releases
DROP POLICY IF EXISTS "Users can update pending releases they manage" ON public.releases;
CREATE POLICY "Users can update pending releases they manage"
ON public.releases
FOR UPDATE
USING (
  status IN ('Pending') AND 
  has_account_access(artist_id, 'manager'::account_role)
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_release_edit_requests_release_id ON public.release_edit_requests(release_id);
CREATE INDEX IF NOT EXISTS idx_release_edit_requests_status ON public.release_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_release_tracks_release_id ON public.release_tracks(release_id, track_number);