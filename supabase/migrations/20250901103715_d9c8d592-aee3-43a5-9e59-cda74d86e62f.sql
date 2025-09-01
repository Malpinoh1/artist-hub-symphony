-- Site notices for scheduled, admin-managed announcements
-- 1) Table
CREATE TABLE IF NOT EXISTS public.site_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info', -- info | success | warning | error
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_notices_valid_time CHECK (end_at IS NULL OR end_at > start_at)
);

-- 2) Enable RLS
ALTER TABLE public.site_notices ENABLE ROW LEVEL SECURITY;

-- 3) Policies
-- Public can read only currently active notices
DROP POLICY IF EXISTS "Public can read active notices" ON public.site_notices;
CREATE POLICY "Public can read active notices"
ON public.site_notices
FOR SELECT
USING (
  is_active
  AND start_at <= now()
  AND (end_at IS NULL OR end_at >= now())
);

-- Admins can manage notices
DROP POLICY IF EXISTS "Admins can manage site notices" ON public.site_notices;
CREATE POLICY "Admins can manage site notices"
ON public.site_notices
FOR ALL
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

-- 4) Trigger to update updated_at
DROP TRIGGER IF EXISTS update_site_notices_updated_at ON public.site_notices;
CREATE TRIGGER update_site_notices_updated_at
BEFORE UPDATE ON public.site_notices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_site_notices_active_window
  ON public.site_notices (is_active, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_site_notices_start_at
  ON public.site_notices (start_at DESC);
