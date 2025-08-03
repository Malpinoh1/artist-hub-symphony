-- Fix the invite issue by ensuring user email matches properly
-- Create platform earnings management tables
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  streams INTEGER NOT NULL DEFAULT 0,
  earnings_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'NGN',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_notes TEXT,
  UNIQUE(artist_id, release_id, platform, period_start, period_end)
);

-- Create royalty statements table
CREATE TABLE IF NOT EXISTS public.royalty_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  statement_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_streams INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'sent')),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for platform_earnings
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_earnings
CREATE POLICY "Admins can manage all platform earnings"
ON public.platform_earnings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Artists can view their own platform earnings"
ON public.platform_earnings
FOR SELECT
USING (auth.uid() = artist_id);

-- Enable RLS for royalty_statements
ALTER TABLE public.royalty_statements ENABLE ROW LEVEL SECURITY;

-- Create policies for royalty_statements
CREATE POLICY "Admins can manage all royalty statements"
ON public.royalty_statements
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Artists can view their own royalty statements"
ON public.royalty_statements
FOR SELECT
USING (auth.uid() = artist_id);

-- Create trigger for updated_at on platform_earnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_earnings_updated_at
    BEFORE UPDATE ON public.platform_earnings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_royalty_statements_updated_at
    BEFORE UPDATE ON public.royalty_statements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();