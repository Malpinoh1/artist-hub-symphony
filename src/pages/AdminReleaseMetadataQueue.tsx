import React, { useEffect, useState } from 'react';
import { Mail, BellRing } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type RequestRow = {
  id: string;
  artist_name: string;
  release_title: string;
  release_type: string;
  upc: string | null;
  required_tracks: Array<{ title: string; isrc?: string }>;
  release_date: string | null;
  cover_art_url: string | null;
  genre: string | null;
  primary_language: string | null;
  explicit_content: boolean | null;
  copyright_info: string | null;
  songwriter_credits: string | null;
  producer_credits: string | null;
  artwork_credits: string | null;
  description: string | null;
  territory: string | null;
  missing_fields: string[];
  status: string;
  admin_notes: string | null;
  submitted_at: string | null;
  account_owner_id: string | null;
};

const AdminReleaseMetadataQueue = () => {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('release_metadata_completion_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Could not load metadata review queue', description: error.message, variant: 'destructive' });
    else setRows((data || []) as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const sendReminders = async () => {
    setSendingReminders(true);
    const { data, error } = await (supabase as any).functions.invoke('notify-release-metadata-completion', { body: { reason: 'admin_manual_reminder' } });
    if (error) {
      toast({ title: 'Could not send reminders', description: error.message, variant: 'destructive' });
    } else {
      const results = data?.results || [];
      const sent = results.filter((r: any) => r.email_status === 'sent').length;
      const failed = results.filter((r: any) => r.email_status === 'failed').length;
      toast({ title: 'Reminder dispatch finished', description: `${sent} owner email(s) sent; ${failed} email(s) failed. In-app notifications are already available in the notification bell.` });
    }
    setSendingReminders(false);
  };

  const markInReview = async (row: RequestRow) => {
    const { error } = await (supabase as any)
      .from('release_metadata_completion_requests')
      .update({ status: 'in_review', updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'submitted');
    if (error) toast({ title: 'Could not update request', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Request marked in review' });
      await load();
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary mb-2">Distribution operations</p>
        <h1 className="text-3xl font-bold">Release metadata review queue</h1>
        <p className="mt-2 text-muted-foreground">Owners' submissions appear here for verification. Confirm the release date, artwork, UPC, ISRCs, track count and structure before completing the catalogue records. Do not attach STREET ANTHEM rows to the standalone LOVE ME release.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void sendReminders()} disabled={sendingReminders} className="gap-2"><Mail className="h-4 w-4" />{sendingReminders ? 'Sending reminders…' : 'Send popup + email reminders'}</Button>
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><BellRing className="h-4 w-4" />In-app notifications also appear in the notification bell.</span>
        </div>
      </div>
      {loading ? <p className="text-muted-foreground py-8">Loading review queue…</p> : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No metadata requests found.</div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <section key={row.id} className="rounded-xl border bg-card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{row.artist_name} · {row.release_type.toUpperCase()}</p>
                  <h2 className="text-xl font-semibold">{row.release_title}</h2>
                  <p className="text-sm text-muted-foreground">UPC: {row.upc || 'Missing'} · Owner ID: {row.account_owner_id || 'Unassigned'}</p>
                </div>
                <span className="rounded-full border px-3 py-1 text-xs font-medium">{row.status.replaceAll('_', ' ')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div>
                  <h3 className="font-medium mb-2">Track structure from statement</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {row.required_tracks?.map((track, i) => <li key={i}>{i + 1}. {track.title}{track.isrc ? ` · ISRC ${track.isrc}` : ''}</li>)}
                  </ul>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Release date:</strong> {row.release_date || 'Not supplied'}</p>
                  <p><strong>Genre:</strong> {row.genre || 'Not supplied'}</p>
                  <p><strong>Language:</strong> {row.primary_language || 'Not supplied'}</p>
                  <p><strong>Explicit:</strong> {row.explicit_content === null ? 'Not supplied' : row.explicit_content ? 'Yes' : 'No'}</p>
                  <p><strong>Copyright:</strong> {row.copyright_info || 'Not supplied'}</p>
                  <p><strong>Territory:</strong> {row.territory || 'Not supplied'}</p>
                  <p><strong>Submitted:</strong> {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : 'Not submitted'}</p>
                </div>
                {row.cover_art_url && <div className="md:col-span-2"><p className="font-medium mb-2">Submitted cover artwork</p><a href={row.cover_art_url} target="_blank" rel="noreferrer" className="text-primary underline break-all">{row.cover_art_url}</a><img src={row.cover_art_url} alt={row.release_title} className="mt-3 h-36 w-36 rounded-lg border object-cover" /></div>}
                <div className="md:col-span-2 text-sm text-muted-foreground space-y-1">
                  <p><strong>Songwriter:</strong> {row.songwriter_credits || 'Not supplied'} · <strong>Producer:</strong> {row.producer_credits || 'Not supplied'} · <strong>Artwork:</strong> {row.artwork_credits || 'Not supplied'}</p>
                  {row.description && <p><strong>Description:</strong> {row.description}</p>}
                  {row.admin_notes && <p><strong>Notes:</strong> {row.admin_notes}</p>}
                  {row.missing_fields?.length > 0 && <p><strong>Still missing:</strong> {row.missing_fields.join(', ')}</p>}
                </div>
              </div>
              {row.status === 'submitted' && <div className="mt-5 flex justify-end"><Button onClick={() => void markInReview(row)}>Mark in review</Button></div>}
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminReleaseMetadataQueue;
