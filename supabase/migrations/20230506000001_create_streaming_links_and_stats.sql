
-- Create table for streaming links
CREATE TABLE IF NOT EXISTS public.streaming_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for performance statistics
CREATE TABLE IF NOT EXISTS public.performance_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  total_streams INTEGER NOT NULL DEFAULT 0,
  spotify_streams INTEGER NOT NULL DEFAULT 0,
  apple_music_streams INTEGER NOT NULL DEFAULT 0,
  youtube_music_streams INTEGER NOT NULL DEFAULT 0,
  other_streams INTEGER NOT NULL DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for streaming_links
ALTER TABLE public.streaming_links ENABLE ROW LEVEL SECURITY;

-- Artists can view their own streaming links
CREATE POLICY "Artists can view their own streaming links"
ON public.streaming_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.releases
    WHERE releases.id = streaming_links.release_id
    AND releases.artist_id = auth.uid()
  )
);

-- Admins can manage all streaming links (using has_role function)
CREATE POLICY "Admins can manage all streaming links"
ON public.streaming_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add RLS policies for performance_statistics
ALTER TABLE public.performance_statistics ENABLE ROW LEVEL SECURITY;

-- Artists can view their own performance statistics
CREATE POLICY "Artists can view their own performance statistics"
ON public.performance_statistics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.releases
    WHERE releases.id = performance_statistics.release_id
    AND releases.artist_id = auth.uid()
  )
);

-- Admins can manage all performance statistics
CREATE POLICY "Admins can manage all performance statistics"
ON public.performance_statistics
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));
