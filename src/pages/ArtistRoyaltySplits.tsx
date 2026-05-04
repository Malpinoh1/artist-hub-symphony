import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, CheckCircle2, Clock, XCircle, GitBranch, Lock } from 'lucide-react';
import CreateRoyaltySplitForm from '@/components/CreateRoyaltySplitForm';

interface SplitRow {
  id: string;
  status: string;
  track_id: string;
  release_id: string | null;
  owner_artist_id: string;
  recipients: { id: string; email: string | null; artist_id: string | null; percentage: number; role: string; status: string }[];
  trackTitle?: string;
  releaseTitle?: string;
}

const statusBadge = (s: string) => {
  if (s === 'locked') return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>;
  if (s === 'active' || s === 'accepted') return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
  if (s === 'declined') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Declined</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
};

const ArtistRoyaltySplits: React.FC = () => {
  const { user } = useAuth();
  const { currentAccountId } = useAccount();
  const accountId = currentAccountId || user?.id || null;

  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      // Splits I own
      const { data: owned } = await supabase
        .from('splits').select('*').eq('owner_artist_id', accountId)
        .order('created_at', { ascending: false });

      // Splits I'm a recipient on
      const { data: asRecipient } = await supabase
        .from('split_recipients').select('split_id').eq('artist_id', accountId);

      const allIds = new Set<string>([
        ...(owned || []).map((s: any) => s.id),
        ...(asRecipient || []).map((r: any) => r.split_id),
      ]);
      if (allIds.size === 0) { setSplits([]); setLoading(false); return; }

      const { data: allSplits } = await supabase
        .from('splits').select('*').in('id', Array.from(allIds));

      const { data: allRecips } = await supabase
        .from('split_recipients').select('*').in('split_id', Array.from(allIds));

      const trackIds = [...new Set((allSplits || []).map((s: any) => s.track_id))];
      const releaseIds = [...new Set((allSplits || []).map((s: any) => s.release_id).filter(Boolean))];

      const [trackRes, releaseRes] = await Promise.all([
        trackIds.length ? supabase.from('tracks').select('id, title').in('id', trackIds) : Promise.resolve({ data: [] }),
        releaseIds.length ? supabase.from('releases').select('id, title').in('id', releaseIds) : Promise.resolve({ data: [] }),
      ]);
      const tMap = new Map((trackRes.data as any[] || []).map(t => [t.id, t.title]));
      const rMap = new Map((releaseRes.data as any[] || []).map(r => [r.id, r.title]));

      const rows: SplitRow[] = (allSplits || []).map((s: any) => ({
        ...s,
        trackTitle: tMap.get(s.track_id) || '—',
        releaseTitle: s.release_id ? (rMap.get(s.release_id) || '—') : '',
        recipients: (allRecips || []).filter((r: any) => r.split_id === s.id),
      }));
      setSplits(rows);
    } finally { setLoading(false); }
  }, [accountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5 sm:h-6 sm:w-6" />Royalty Splits
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Splits become locked once the track earns money — set them up before earnings arrive.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />New Split</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Royalty Split</DialogTitle></DialogHeader>
            <CreateRoyaltySplitForm onSuccess={() => { setOpen(false); fetchData(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {splits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No splits yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {splits.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.trackTitle}</p>
                    {s.releaseTitle && <p className="text-xs text-muted-foreground truncate">{s.releaseTitle}</p>}
                  </div>
                  {statusBadge(s.status)}
                </div>
                <div className="space-y-2">
                  {s.recipients.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm">{r.email || r.artist_id?.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{r.role}</p>
                      </div>
                      <span className="font-mono text-sm">{r.percentage}%</span>
                      {statusBadge(r.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistRoyaltySplits;
