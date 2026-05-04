import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Music, Upload, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Release { id: string; title: string; artist_name: string | null; }
interface Track { id: string; title: string; track_number: number; }
interface Recipient { email: string; role: string; percentage: string; }

interface Props {
  preSelectedReleaseId?: string;
  onSuccess?: () => void;
}

const CreateRoyaltySplitForm: React.FC<Props> = ({ preSelectedReleaseId, onSuccess }) => {
  const { user } = useAuth();
  const { currentAccountId } = useAccount();
  const navigate = useNavigate();
  const accountId = currentAccountId || user?.id || null;

  const [releases, setReleases] = useState<Release[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRelease, setSelectedRelease] = useState(preSelectedReleaseId || '');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [ownerPct, setOwnerPct] = useState<string>('100');
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const fetchReleases = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data } = await supabase
      .from('releases')
      .select('id, title, artist_name')
      .eq('artist_id', accountId)
      .order('release_date', { ascending: false });
    setReleases(data || []);
    setLoading(false);
  }, [accountId]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  useEffect(() => {
    if (!selectedRelease) { setTracks([]); setSelectedTrack(''); return; }
    (async () => {
      let { data: trks } = await supabase
        .from('tracks').select('id, title')
        .eq('release_id', selectedRelease).order('created_at');
      if (!trks || trks.length === 0) {
        const { data: rt } = await supabase
          .from('release_tracks').select('id, title, track_number')
          .eq('release_id', selectedRelease).order('track_number');
        if (rt && rt.length > 0) {
          const { data: rel } = await supabase.from('releases').select('artist_id').eq('id', selectedRelease).maybeSingle();
          for (const t of rt) {
            await supabase.from('tracks').insert({
              title: t.title, primary_artist_id: rel?.artist_id || accountId,
              release_id: selectedRelease, release_track_id: t.id,
            });
          }
          ({ data: trks } = await supabase.from('tracks').select('id, title').eq('release_id', selectedRelease).order('created_at'));
        }
      }
      setTracks((trks || []).map((t, i) => ({ id: t.id, title: t.title, track_number: i + 1 })));
      setSelectedTrack('');
    })();
  }, [selectedRelease, accountId]);

  const recipTotal = recipients.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
  const owner = Number(ownerPct) || 0;
  const total = owner + recipTotal;
  const remaining = 100 - total;

  const addRecipient = () => setRecipients(p => [...p, { email: '', role: 'collaborator', percentage: '' }]);
  const removeRecipient = (i: number) => setRecipients(p => p.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Recipient, v: string) =>
    setRecipients(p => p.map((r, idx) => idx === i ? { ...r, [field]: v } : r));

  const autoFill = (i: number) => {
    const others = recipients.reduce((s, r, idx) => idx === i ? s : s + (Number(r.percentage) || 0), 0);
    const fill = Math.max(0, 100 - owner - others);
    update(i, 'percentage', String(fill));
  };

  const submit = async () => {
    if (!user || !selectedTrack) return;
    if (Math.abs(total - 100) > 0.001) { toast.error(`Total must equal 100% (currently ${total.toFixed(2)}%)`); return; }
    if (owner <= 0) { toast.error('Your share must be greater than 0'); return; }
    if (recipients.length === 0) { toast.error('Add at least one collaborator'); return; }

    const emails = recipients.map(r => r.email.toLowerCase().trim());
    if (new Set(emails).size !== emails.length) { toast.error('Duplicate collaborator emails'); return; }
    for (const r of recipients) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) { toast.error(`Invalid email: ${r.email}`); return; }
      if (Number(r.percentage) <= 0) { toast.error('All percentages must be > 0'); return; }
    }

    setSubmitting(true);
    try {
      // Upsert split row for this track
      const { data: existingSplit } = await supabase.from('splits').select('id, status').eq('track_id', selectedTrack).maybeSingle();
      if (existingSplit?.status === 'locked') {
        toast.error('This track already has earnings — split is locked.'); setSubmitting(false); return;
      }
      let splitId = existingSplit?.id as string | undefined;
      if (!splitId) {
        const { data: newSplit, error: sErr } = await supabase.from('splits').insert([{
          track_id: selectedTrack, release_id: selectedRelease || null,
          owner_artist_id: accountId, status: 'active',
        }]).select('id').single();
        if (sErr) throw sErr;
        splitId = newSplit.id;
      } else {
        await supabase.from('splits').update({ status: 'active' }).eq('id', splitId);
        await supabase.from('split_recipients').delete().eq('split_id', splitId);
      }

      // Owner row (auto-accepted)
      await supabase.from('split_recipients').insert([{
        split_id: splitId, artist_id: accountId, email: user.email,
        percentage: owner, role: 'owner', status: 'accepted', accepted_at: new Date().toISOString(),
      }]);

      // Collaborators
      const releaseTitle = releases.find(r => r.id === selectedRelease)?.title || 'Unknown';
      const trackTitle = tracks.find(t => t.id === selectedTrack)?.title || 'Unknown';

      for (const c of recipients) {
        const email = c.email.toLowerCase().trim();
        const { data: existingArtist } = await supabase.from('artists').select('id').eq('email', email).maybeSingle();
        const { data: rec, error: rErr } = await supabase.from('split_recipients').insert([{
          split_id: splitId, artist_id: existingArtist?.id || null, email,
          percentage: Number(c.percentage), role: c.role, status: 'pending',
        }]).select('invitation_token').single();
        if (rErr) throw rErr;

        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: "You've been invited to a royalty split",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#1a1a2e;padding:24px;text-align:center"><h1 style="color:#fff;margin:0">MALPINOHdistro</h1></div>
                <div style="padding:32px 24px">
                  <h2>Royalty Split Invitation</h2>
                  <p>You have been invited to receive royalties for:</p>
                  <div style="background:#f5f5f7;padding:16px;border-radius:8px;margin:16px 0">
                    <p><strong>Track:</strong> ${trackTitle}</p>
                    <p><strong>Release:</strong> ${releaseTitle}</p>
                    <p><strong>Your share:</strong> ${c.percentage}%</p>
                    <p><strong>Role:</strong> ${c.role}</p>
                  </div>
                  <div style="text-align:center;margin:24px 0">
                    <a href="${window.location.origin}/accept-split?token=${rec.invitation_token}"
                       style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600">Accept Split</a>
                  </div>
                </div></div>`,
            },
          });
        } catch (e) { console.warn('Email failed for', email); }
      }

      toast.success('Split created and invitations sent');
      setRecipients([]); setOwnerPct('100'); setSelectedTrack('');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create split');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Music className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-lg">No releases yet</h3>
          <p className="text-muted-foreground text-sm">Upload your first release to create royalty splits.</p>
          <Button onClick={() => navigate('/release-form')} className="min-h-[44px]"><Upload className="h-4 w-4 mr-2" />Upload Release</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">1. Pick release & track</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Release</Label>
            <Select value={selectedRelease} onValueChange={setSelectedRelease}>
              <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Choose a release..." /></SelectTrigger>
              <SelectContent>
                {releases.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.title}{r.artist_name ? ` — ${r.artist_name}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRelease && (
            <div>
              <Label className="text-xs">Track</Label>
              {tracks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No tracks found for this release.</p>
              ) : (
                <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Choose a track..." /></SelectTrigger>
                  <SelectContent>
                    {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.track_number}. {t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTrack && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">2. Set up split</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total must equal exactly 100%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner */}
            <div className="rounded-lg border bg-muted/40 p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Primary Artist (You)</p>
                  <p className="font-medium truncate text-sm">{user?.email}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">Owner</Badge>
              </div>
              <div>
                <Label className="text-xs">Your share %</Label>
                <Input type="number" min="0.01" max="100" step="0.01" inputMode="decimal"
                  className="min-h-[44px]" value={ownerPct} onChange={e => setOwnerPct(e.target.value)} />
              </div>
            </div>

            {/* Recipients */}
            {recipients.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Collaborator {i + 1}</p>
                  <Button variant="ghost" size="icon" onClick={() => removeRecipient(i)} className="min-h-[44px] min-w-[44px]">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" inputMode="email" className="min-h-[44px]"
                    placeholder="collaborator@email.com" value={r.email}
                    onChange={e => update(i, 'email', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Select value={r.role} onValueChange={v => update(i, 'role', v)}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborator">Collaborator</SelectItem>
                        <SelectItem value="producer">Producer</SelectItem>
                        <SelectItem value="songwriter">Songwriter</SelectItem>
                        <SelectItem value="featured">Featured Artist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Percentage</Label>
                    <div className="flex gap-1">
                      <Input type="number" min="0.01" max="100" step="0.01" inputMode="decimal"
                        className="min-h-[44px]" value={r.percentage}
                        onChange={e => update(i, 'percentage', e.target.value)} placeholder="0" />
                      <Button type="button" variant="outline" size="icon" className="min-h-[44px] min-w-[44px] shrink-0"
                        onClick={() => autoFill(i)} title="Fill remaining">
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addRecipient} className="w-full min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />Add Collaborator
            </Button>

            {/* Live total */}
            <div className={`rounded-lg p-3 border-2 ${
              Math.abs(total - 100) < 0.001 ? 'border-green-500 bg-green-500/10' :
              total > 100 ? 'border-destructive bg-destructive/10' : 'border-yellow-500 bg-yellow-500/10'
            }`}>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{total.toFixed(2)}% / 100%</span>
              </div>
              {Math.abs(total - 100) >= 0.001 && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {remaining > 0 ? `${remaining.toFixed(2)}% remaining` : `Over by ${Math.abs(remaining).toFixed(2)}%`}
                </p>
              )}
            </div>

            <Button onClick={submit} disabled={submitting || Math.abs(total - 100) >= 0.001 || recipients.length === 0}
              className="w-full min-h-[48px]">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save & Send Invitations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateRoyaltySplitForm;
