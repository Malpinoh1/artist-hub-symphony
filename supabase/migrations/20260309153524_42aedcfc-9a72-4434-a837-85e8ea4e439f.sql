
-- Add new columns to releases table for distribution preferences
ALTER TABLE public.releases 
  ADD COLUMN IF NOT EXISTS territory text DEFAULT 'World',
  ADD COLUMN IF NOT EXISTS release_time text,
  ADD COLUMN IF NOT EXISTS release_timezone text,
  ADD COLUMN IF NOT EXISTS pre_order_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_order_previews boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS wizard_step integer DEFAULT 1;

-- Create release_store_selections table
CREATE TABLE IF NOT EXISTS public.release_store_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  store_category text NOT NULL DEFAULT 'essential',
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(release_id, store_name)
);

-- Create release_audio_clips table
CREATE TABLE IF NOT EXISTS public.release_audio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.release_tracks(id) ON DELETE CASCADE,
  clip_start integer NOT NULL DEFAULT 0,
  clip_end integer NOT NULL DEFAULT 30,
  clip_type text NOT NULL DEFAULT 'ringtone',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(track_id, clip_type)
);

-- Create release_free_tracks table
CREATE TABLE IF NOT EXISTS public.release_free_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.release_tracks(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(release_id, track_id)
);

-- Enable RLS on new tables
ALTER TABLE public.release_store_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_audio_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_free_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for release_store_selections
CREATE POLICY "Users can manage store selections for their releases"
  ON public.release_store_selections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.releases 
    WHERE releases.id = release_store_selections.release_id 
    AND (user_is_admin() OR (user_has_active_subscription() AND has_account_access(releases.artist_id, 'manager'::account_role)))
  ));

CREATE POLICY "Admins can manage all store selections"
  ON public.release_store_selections FOR ALL
  USING (user_is_admin());

-- RLS policies for release_audio_clips
CREATE POLICY "Users can manage audio clips for their releases"
  ON public.release_audio_clips FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.releases 
    WHERE releases.id = release_audio_clips.release_id 
    AND (user_is_admin() OR (user_has_active_subscription() AND has_account_access(releases.artist_id, 'manager'::account_role)))
  ));

CREATE POLICY "Admins can manage all audio clips"
  ON public.release_audio_clips FOR ALL
  USING (user_is_admin());

-- RLS policies for release_free_tracks
CREATE POLICY "Users can manage free tracks for their releases"
  ON public.release_free_tracks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.releases 
    WHERE releases.id = release_free_tracks.release_id 
    AND (user_is_admin() OR (user_has_active_subscription() AND has_account_access(releases.artist_id, 'manager'::account_role)))
  ));

CREATE POLICY "Admins can manage all free tracks"
  ON public.release_free_tracks FOR ALL
  USING (user_is_admin());
