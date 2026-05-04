import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, Lock, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Row {
  id: string; status: string; track_id: string; owner_artist_id: string;
  trackTitle?: string; ownerName?: string;
  recipients: { id: string; email: string | null; artist_id: string | null; percentage: number; role: string; status: string; artistName?: string }[];
}

const badge = (s: string) => {
  if (s === 'locked') return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>;
  if (s === 'active' || s === 'accepted') return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
  if (s === 'declined') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Declined</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
};

const RoyaltySplitRequestsTab: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: splits } = await supabase.from('splits').select('*').order('created_at', { ascending: false });
      if (!splits || splits.length === 0) { setRows([]); return; }
      const splitIds = splits.map((s: any) => s.id);
      const trackIds = [...new Set(splits.map((s: any) => s.track_id))];
      const ownerIds = [...new Set(splits.map((s: any) => s.owner_artist_id))];

      const [recRes, trackRes, artistRes] = await Promise.all([
        supabase.from('split_recipients').select('*').in('split_id', splitIds),
        supabase.from('tracks').select('id, title').in('id', trackIds),
        supabase.from('artists').select('id, name').in('id', ownerIds),
      ]);
      const tMap = new Map((trackRes.data as any[] || []).map(t => [t.id, t.title]));
      const aMap = new Map((artistRes.data as any[] || []).map(a => [a.id, a.name]));

      const allRecArtistIds = [...new Set((recRes.data as any[] || []).map(r => r.artist_id).filter(Boolean))];
      const { data: recArtists } = allRecArtistIds.length
        ? await supabase.from('artists').select('id, name').in('id', allRecArtistIds)
        : { data: [] as any[] };
      const raMap = new Map((recArtists as any[] || []).map(a => [a.id, a.name]));

      setRows(splits.map((s: any) => ({
        ...s,
        trackTitle: tMap.get(s.track_id) || '—',
        ownerName: aMap.get(s.owner_artist_id) || '—',
        recipients: (recRes.data as any[] || [])
          .filter(r => r.split_id === s.id)
          .map(r => ({ ...r, artistName: r.artist_id ? raMap.get(r.artist_id) : null })),
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2"><GitBranch className="h-4 w-4 sm:h-5 sm:w-5" />Royalty Splits Oversight</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">Splits are owned by artists. Locked splits already have earnings and cannot be edited.</p>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No splits yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map(r => {
            const total = r.recipients.filter(x => x.status !== 'declined').reduce((s, x) => s + Number(x.percentage), 0);
            return (
              <Card key={r.id}>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-sm">{r.trackTitle}</p>
                      <p className="text-[11px] text-muted-foreground truncate">Owner: {r.ownerName}</p>
                    </div>
                    {badge(r.status)}
                  </div>
                  <div className="space-y-1">
                    {r.recipients.map(rec => (
                      <div key={rec.id} className="flex items-center justify-between gap-2 text-xs sm:text-sm py-1 border-b last:border-0">
                        <div className="min-w-0 flex-1 truncate">
                          {rec.artistName || rec.email || '—'} <span className="text-muted-foreground">· {rec.role}</span>
                        </div>
                        <span className="font-mono">{rec.percentage}%</span>
                        {badge(rec.status)}
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs font-medium ${Math.abs(total - 100) < 0.001 ? 'text-green-600' : 'text-yellow-600'}`}>
                    Allocated: {total.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoyaltySplitRequestsTab;
