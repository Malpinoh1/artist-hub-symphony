
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Music, AlertTriangle, LogIn } from 'lucide-react';

interface InvitationDetails {
  id: string;
  track_id: string;
  release_id: string | null;
  invited_email: string;
  percentage: number;
  role: string;
  status: string;
  invited_by: string;
  expires_at: string;
  track_title?: string;
  release_title?: string;
  inviter_name?: string;
}

const AcceptSplit: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('split_invitations')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (fetchError || !data) {
          setError('Invalid or expired invitation link.');
          setLoading(false);
          return;
        }

        // Check expiry
        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired.');
          setLoading(false);
          return;
        }

        const inv = data as any;

        // Fetch track title
        let trackTitle = 'Unknown Track';
        if (inv.track_id) {
          const { data: trackData } = await supabase
            .from('release_tracks')
            .select('title')
            .eq('id', inv.track_id)
            .maybeSingle();
          if (trackData) trackTitle = trackData.title;
          else {
            const { data: trackData2 } = await supabase
              .from('tracks')
              .select('title')
              .eq('id', inv.track_id)
              .maybeSingle();
            if (trackData2) trackTitle = trackData2.title;
          }
        }

        // Fetch release title
        let releaseTitle = '';
        if (inv.release_id) {
          const { data: relData } = await supabase
            .from('releases')
            .select('title')
            .eq('id', inv.release_id)
            .maybeSingle();
          if (relData) releaseTitle = relData.title;
        }

        // Fetch inviter name
        let inviterName = 'Unknown';
        const { data: inviterData } = await supabase
          .from('artists')
          .select('name')
          .eq('id', inv.invited_by)
          .maybeSingle();
        if (inviterData) inviterName = inviterData.name;

        setInvitation({
          ...inv,
          track_title: trackTitle,
          release_title: releaseTitle,
          inviter_name: inviterName,
        });
      } catch {
        setError('Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation || !user) return;
    setProcessing(true);
    try {
      // Update invitation status
      const { error } = await supabase
        .from('split_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);
      if (error) throw error;

      // Create royalty split for the accepting user if not exists
      const { data: existing } = await supabase
        .from('royalty_splits')
        .select('id')
        .eq('track_id', invitation.track_id)
        .eq('artist_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('royalty_splits').insert({
          track_id: invitation.track_id,
          artist_id: user.id,
          percentage: invitation.percentage,
          status: 'pending',
          created_by: invitation.invited_by,
          release_id: invitation.release_id,
        });
      }

      toast.success('Royalty split accepted! It will be active after admin approval.');
      setInvitation(prev => prev ? { ...prev, status: 'accepted' } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept split');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('split_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);
      if (error) throw error;

      toast.success('Invitation declined.');
      setInvitation(prev => prev ? { ...prev, status: 'declined' } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="font-semibold text-lg">{error}</h2>
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const isAlreadyActioned = invitation.status !== 'pending';

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <Music className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle className="text-xl">Royalty Split Invitation</CardTitle>
          <CardDescription>You've been invited to receive royalties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Track</span>
              <span className="font-medium">{invitation.track_title}</span>
            </div>
            {invitation.release_title && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Release</span>
                <span className="font-medium">{invitation.release_title}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your Share</span>
              <span className="font-semibold text-primary">{invitation.percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="capitalize">{invitation.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invited By</span>
              <span>{invitation.inviter_name}</span>
            </div>
          </div>

          {isAlreadyActioned ? (
            <div className="text-center space-y-3">
              {invitation.status === 'accepted' && (
                <>
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                  <p className="font-medium text-green-600">Split accepted!</p>
                  <p className="text-sm text-muted-foreground">Your split will be active after admin approval.</p>
                </>
              )}
              {invitation.status === 'declined' && (
                <>
                  <XCircle className="h-10 w-10 mx-auto text-destructive" />
                  <p className="font-medium text-destructive">Invitation declined.</p>
                </>
              )}
              <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : !user ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You need an account to accept this royalty split invitation.
              </p>
              <Button onClick={() => navigate(`/auth?redirect=/accept-split?token=${token}`)}>
                <LogIn className="h-4 w-4 mr-2" />Create Account / Sign In
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Accept Split
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={processing}
              >
                <XCircle className="h-4 w-4 mr-2" />Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptSplit;
