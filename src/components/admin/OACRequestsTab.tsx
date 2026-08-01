import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Youtube, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

const STATUSES = ['pending', 'submitted', 'needs_info', 'approved', 'rejected'] as const;

const statusClass: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-500',
  submitted: 'bg-blue-500/15 text-blue-500',
  needs_info: 'bg-orange-500/15 text-orange-500',
  approved: 'bg-emerald-500/15 text-emerald-500',
  rejected: 'bg-destructive/15 text-destructive',
};

const OACRequestsTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('oac_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Failed to load OAC requests');
    } else {
      setRows(data || []);
      setNotes(Object.fromEntries((data || []).map(r => [r.id, r.admin_notes || ''])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRow = async (id: string, status: string) => {
    setSavingId(id);
    const patch: any = {
      status,
      admin_notes: notes[id]?.trim() || null,
      processed_at: new Date().toISOString(),
    };
    if (status === 'submitted') patch.submitted_at = new Date().toISOString();
    const { error } = await supabase.from('oac_requests').update(patch).eq('id', id);
    if (error) {
      console.error(error);
      toast.error(error.message || 'Update failed');
    } else {
      setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
      toast.success(`Request marked as ${status.replace('_', ' ')}`);
    }
    setSavingId(null);
  };

  const visible = filter === 'all' ? rows : rows.filter(r => r.status === filter);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading OAC requests…</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              filter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
            }`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            <span className="ml-1 opacity-70">
              {s === 'all' ? rows.length : rows.filter(r => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No requests in this view.</p>
      ) : (
        <div className="space-y-4">
          {visible.map(r => (
            <div key={r.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <Youtube className="w-4 h-4 text-red-500" />
                    {r.artist_name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary" className={statusClass[r.status] || ''}>
                  {String(r.status).replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-1 text-sm mb-3">
                <a href={r.youtube_channel_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 break-all">
                  {r.youtube_channel_url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                {r.topic_channel_url && (
                  <a href={r.topic_channel_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:underline flex items-center gap-1 break-all">
                    Topic: {r.topic_channel_url}
                  </a>
                )}
                {r.notes && <p className="text-muted-foreground">Artist note: {r.notes}</p>}
              </div>

              <Textarea rows={2} placeholder="Admin note visible to the artist…"
                value={notes[r.id] ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                className="mb-3" />

              <div className="flex flex-wrap gap-2">
                {STATUSES.filter(s => s !== r.status).map(s => (
                  <Button key={s} size="sm"
                    variant={s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'outline'}
                    disabled={savingId === r.id}
                    onClick={() => updateRow(r.id, s)}>
                    {savingId === r.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Mark {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OACRequestsTab;
