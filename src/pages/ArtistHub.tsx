import React, { useEffect, useState } from 'react';
import { Youtube, Music2, ExternalLink, Loader2, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const TIKTOK_CLAIM_URL =
  'https://www.tiktok.com/m-c/music_artist_certification_h5/index.html?enter_from=non_testgroup_user';

const TIKTOK_STEPS = [
  {
    title: 'Search for your profile',
    body: 'An "Apply now" screen appears. Type your exact artist name into the search bar — use the same spelling that appears on Spotify, Apple Music and other streaming platforms.',
  },
  {
    title: 'Locate and claim your catalog',
    body: 'Scroll the search results until you find the entry that contains your official music and albums, then tap "Claim" next to your correct artist profile.',
  },
  {
    title: 'Upload your backstage proof',
    body: 'TikTok requires visual proof that you own the catalog. Upload screenshots from Spotify for Artists, Apple Music for Artists or your MALPINOHDISTRO dashboard. The images must clearly show your artist name, track/album titles and visible account editing or backend buttons. Do not upload selfies, ID cards or promotional artwork — those are auto-rejected.',
  },
  {
    title: 'Submit for editorial review',
    body: 'Tap "Submit" at the bottom of the page. TikTok reviews submissions manually within 7 to 30 days. Once approved, the Artist Tag and Music Tab launch automatically on your TikTok profile.',
  },
];

const statusMeta: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: 'Pending review', icon: Clock, className: 'bg-amber-500/15 text-amber-500' },
  submitted: { label: 'Submitted to YouTube', icon: Loader2, className: 'bg-blue-500/15 text-blue-500' },
  needs_info: { label: 'More info needed', icon: Info, className: 'bg-orange-500/15 text-orange-500' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-500' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
};

const ArtistHub: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [form, setForm] = useState({
    artist_name: '',
    youtube_channel_url: '',
    topic_channel_url: '',
    release_id: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [{ data: reqs }, { data: artist }, { data: rels }] = await Promise.all([
          supabase
            .from('oac_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase.from('artists').select('name').eq('id', user.id).maybeSingle(),
          supabase
            .from('releases')
            .select('id, title')
            .eq('artist_id', user.id)
            .order('release_date', { ascending: false })
            .limit(50),
        ]);
        setRequests(reqs || []);
        setReleases(rels || []);
        if (artist?.name) setForm(f => ({ ...f, artist_name: f.artist_name || artist.name }));
      } catch (e) {
        console.error('Error loading artist hub:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const submitOac = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.artist_name.trim() || !form.youtube_channel_url.trim()) {
      toast({ title: 'Missing details', description: 'Artist name and YouTube channel link are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('oac_requests')
        .insert([{
          user_id: user.id,
          artist_id: user.id,
          artist_name: form.artist_name.trim(),
          youtube_channel_url: form.youtube_channel_url.trim(),
          topic_channel_url: form.topic_channel_url.trim() || null,
          release_id: form.release_id || null,
          notes: form.notes.trim() || null,
          status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      setRequests(prev => [data, ...prev]);
      setForm(f => ({ ...f, youtube_channel_url: '', topic_channel_url: '', release_id: '', notes: '' }));
      toast({ title: 'Request submitted', description: 'Our distribution team will review your OAC request shortly.' });
    } catch (err: any) {
      console.error('OAC request failed:', err);
      toast({ title: 'Submission failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Artist Hub</h1>
        <p className="text-muted-foreground">
          Claim your official presence on YouTube and TikTok to unlock artist tags, music tabs and richer profiles.
        </p>
      </div>

      {/* YouTube OAC */}
      <AnimatedCard>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              YouTube Official Artist Channel (OAC)
            </CardTitle>
            <CardDescription>
              Request an OAC and we'll merge your topic channel, music videos and releases into one verified channel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitOac} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label htmlFor="artist_name">Artist name *</Label>
                <Input id="artist_name" value={form.artist_name}
                  onChange={e => setForm({ ...form, artist_name: e.target.value })}
                  placeholder="As it appears on streaming platforms" />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="youtube_channel_url">YouTube channel link *</Label>
                <Input id="youtube_channel_url" value={form.youtube_channel_url}
                  onChange={e => setForm({ ...form, youtube_channel_url: e.target.value })}
                  placeholder="https://youtube.com/@yourchannel" />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="topic_channel_url">Topic channel link (optional)</Label>
                <Input id="topic_channel_url" value={form.topic_channel_url}
                  onChange={e => setForm({ ...form, topic_channel_url: e.target.value })}
                  placeholder="https://youtube.com/channel/UC..." />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="release_id">Related release (optional)</Label>
                <select id="release_id" value={form.release_id}
                  onChange={e => setForm({ ...form, release_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select a release…</option>
                  {releases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notes for our team (optional)</Label>
                <Textarea id="notes" rows={3} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anything that helps us verify your channel ownership" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit OAC request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Request history */}
      <AnimatedCard delay={100}>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your OAC requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No OAC requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map(r => {
                  const meta = statusMeta[r.status] || statusMeta.pending;
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{r.artist_name}</div>
                        <Badge className={meta.className} variant="secondary">
                          <Icon className="w-3 h-3 mr-1" />{meta.label}
                        </Badge>
                      </div>
                      <a href={r.youtube_channel_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all">
                        {r.youtube_channel_url}
                      </a>
                      {r.admin_notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium text-foreground">Team note: </span>{r.admin_notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* TikTok Artist Hub */}
      <AnimatedCard delay={200}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="w-5 h-5 text-primary" />
              Claim your TikTok Artist Hub
            </CardTitle>
            <CardDescription>
              Get the TikTok Artist Tag and a dedicated Music Tab on your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Open this link on your <strong>mobile device</strong> with the TikTok app installed and signed in — the
                certification screen opens inside the app.
              </AlertDescription>
            </Alert>

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={TIKTOK_CLAIM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Music2 className="w-4 h-4" />
                Open TikTok Artist Certification
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>

            <ol className="space-y-4">
              {TIKTOK_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-sm text-muted-foreground">
              Running into trouble with any of these steps?{' '}
              <a href="/support" className="text-primary hover:underline">Contact MALPINOHDISTRO support</a>.
            </p>
          </CardContent>
        </Card>
      </AnimatedCard>
    </div>
  );
};

export default ArtistHub;
