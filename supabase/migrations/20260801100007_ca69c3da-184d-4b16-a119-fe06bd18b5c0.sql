CREATE TABLE public.oac_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  youtube_channel_url text NOT NULL,
  topic_channel_url text,
  release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  submitted_at timestamp with time zone,
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oac_requests TO authenticated;
GRANT ALL ON public.oac_requests TO service_role;

ALTER TABLE public.oac_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own OAC requests"
ON public.oac_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR artist_id = auth.uid() OR public.user_is_admin(auth.uid()));

CREATE POLICY "Artists can create their own OAC requests"
ON public.oac_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Artists can update their pending OAC requests"
ON public.oac_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all OAC requests"
ON public.oac_requests FOR ALL TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE INDEX idx_oac_requests_artist ON public.oac_requests(artist_id);
CREATE INDEX idx_oac_requests_status ON public.oac_requests(status);

CREATE TRIGGER update_oac_requests_updated_at
BEFORE UPDATE ON public.oac_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();