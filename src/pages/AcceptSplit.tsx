import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Music, AlertTriangle, LogIn } from 'lucide-react';

const AcceptSplit: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = params.get('token');

  const [recipient, setRecipient] = useState<any>(null);
  const [meta, setMeta] = useState<{ track: string; release: string; owner: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('No invitation token provided.'); setLoading(false); return; }
    (async () => {
      try {
        const { data: rec, error: rErr } = await supabase
          .from('split_recipients').select('*').eq('invitation_token', token).maybeSingle();
        if (rErr || !rec) { setError('Invalid or expired invitation.'); setLoading(false); return; }
        setRecipient(rec);
        const { data: split } = await supabase.from('splits').select('track_id, release_id, owner_artist_id').eq('id', rec.split_id).maybeSingle();
        if (split) {
          const [trk, rel, own] = await Promise.all([
            supabase.from('tracks').select('title').eq('id', split.track_id).maybeSingle(),
            split.release_id ? supabase.from('releases').select('title').eq('id', split.release_id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from('artists').select('name').eq('id', split.owner_artist_id).maybeSingle(),
          ]);
          setMeta({
            track: (trk.data as any)?.title || 'Unknown',
            release: (rel.data as any)?.title || '',
            owner: (own.data as any)?.name || 'Artist',
          });
        }
      } catch { setError('Failed to load invitation.'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const respond = async (accept: boolean) => {
    if (!recipient || !user) return;
    setProcessing(true);
    try {
      const updates: any = {
        status: accept ? 'accepted' : 'declined',
        accepted_at: accept ? new Date().toISOString() : null,
      };
      if (accept && !recipient.artist_id) updates.artist_id = user.id;
      const { error } = await supabase.from('split_recipients').update(updates).eq('id', recipient.id);
      if (error) throw error;
      toast.success(accept ? 'Split accepted! Future earnings will be credited to you.' : 'Invitation declined.');
      setRecipient({ ...recipient, ...updates });
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="font-semibold text-lg">{error}</h2>
            <Button variant="outline" onClick={() => navigate('/')} className="min-h-[44px]">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const done = recipient.status !== 'pending';

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <Music className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle className="text-xl">Royalty Split Invitation</CardTitle>
          <CardDescription>You've been invited to receive royalties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Track</span><span className="font-medium text-right">{meta?.track}</span></div>
            {meta?.release && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Release</span><span className="font-medium text-right">{meta.release}</span></div>}
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Your Share</span><span className="font-semibold text-primary">{recipient.percentage}%</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Role</span><span className="capitalize">{recipient.role}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">From</span><span>{meta?.owner}</span></div>
          </div>

          {done ? (
            <div className="text-center space-y-3">
              {recipient.status === 'accepted' ? (
                <><CheckCircle2 className="h-10 w-10 mx-auto text-green-600" /><p className="font-medium text-green-600">Split accepted!</p></>
              ) : (
                <><XCircle className="h-10 w-10 mx-auto text-destructive" /><p className="font-medium text-destructive">Invitation declined.</p></>
              )}
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="min-h-[44px]">Go to Dashboard</Button>
            </div>
          ) : !user ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">You need an account to accept this split.</p>
              <Button onClick={() => navigate(`/auth?redirect=/accept-split?token=${token}`)} className="min-h-[44px]">
                <LogIn className="h-4 w-4 mr-2" />Sign In / Create Account
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1 min-h-[48px]" onClick={() => respond(true)} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Accept
              </Button>
              <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => respond(false)} disabled={processing}>
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
