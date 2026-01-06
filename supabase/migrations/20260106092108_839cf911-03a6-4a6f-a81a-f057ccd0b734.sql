-- Create support tickets table
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create support ticket messages table
CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create artist_accounts table for multi-artist management
CREATE TABLE public.artist_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  artist_name text NOT NULL,
  artist_email text,
  bio text,
  genre text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_accounts ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id OR user_is_admin());

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (user_is_admin());

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);

-- Support ticket messages policies
CREATE POLICY "Users can view messages for their tickets"
ON public.support_ticket_messages
FOR SELECT
USING (
  user_is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their tickets"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    user_is_admin() OR
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  )
);

-- Artist accounts policies
CREATE POLICY "Users can view their own artist accounts"
ON public.artist_accounts
FOR SELECT
USING (auth.uid() = owner_id OR user_is_admin());

CREATE POLICY "Users can create their own artist accounts"
ON public.artist_accounts
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own artist accounts"
ON public.artist_accounts
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own artist accounts"
ON public.artist_accounts
FOR DELETE
USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all artist accounts"
ON public.artist_accounts
FOR ALL
USING (user_is_admin());

-- Enable realtime for support tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;

-- Create trigger for updated_at on support_tickets
CREATE OR REPLACE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on artist_accounts
CREATE OR REPLACE TRIGGER update_artist_accounts_updated_at
BEFORE UPDATE ON public.artist_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();