-- Create activity_logs table for tracking all account activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view activity logs for accounts they have access to"
ON public.activity_logs FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(artist_id, 'viewer'::account_role))
);

CREATE POLICY "Users can create activity logs for accounts they manage"
ON public.activity_logs FOR INSERT
WITH CHECK (
  user_is_admin() OR 
  has_account_access(artist_id, 'manager'::account_role)
);

CREATE POLICY "Admins can manage all activity logs"
ON public.activity_logs FOR ALL
USING (user_is_admin());

-- Create index for faster queries
CREATE INDEX idx_activity_logs_artist_id ON public.activity_logs(artist_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);