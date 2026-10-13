import React, { useEffect, useState } from 'react';
import { CalendarDays, ImagePlus, CheckCircle2, AlertCircle, Music2, Upload } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

type MetadataRequest = {
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
};

const ReleaseMetadataCompletion = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MetadataRequest[]>([]);
  const [values, setValues] = useState<Record<string, Partial<MetadataRequest>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('release_metadata_completion_requests')
      .select('*')
      .in('status', ['awaiting_owner', 'needs_changes'])
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Could not load metadata requests', description: error.message, variant: 'destructive' });
    } else {
      const rows = (data || []) as MetadataRequest[];
      setRequests(rows);
      setValues(Object.fromEntries(rows.map((row) => [row.id, {
        release_date: row.release_date || '',
        cover_art_url: row.cover_art_url || '',
        genre: row.genre || '',
        primary_language: row.primary_language || '',
        explicit_content: row.explicit_content ?? false,
        copyright_info: row.copyright_info || '',
        songwriter_credits: row.songwriter_credits || '',
        producer_credits: row.producer_credits || '',
        artwork_credits: row.artwork_credits || '',
        description: row.description || '',
        territory: row.territory || 'Worldwide',
      }])));
    }
    setLoading(false);
  };

  useEffect(() => { void loadRequests(); }, [user?.id]);

  const setField = (id: string, field: string, value: unknown) => {
    setValues((old) => ({ ...old, [id]: { ...old[id], [field]: value } }));
  };

  const uploadArtwork = async (requestId: string, file?: File) => {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Choose an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Image must be 15 MB or smaller', variant: 'destructive' });
      return;
    }
    setUploading(requestId);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/metadata-completion/${requestId}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('release_artwork').upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: 'Artwork upload failed', description: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('release_artwork').getPublicUrl(path);
      setField(requestId, 'cover_art_url', data.publicUrl);
      toast({ title: 'Artwork uploaded' });
    }
    setUploading(null);
  };

  const submit = async (request: MetadataRequest) => {
    const form = values[request.id] || {};
    if (!form.release_date || !form.cover_art_url) {
      toast({ title: 'Release date and cover artwork are required', description: 'Add the official date and upload the correct artwork before submitting.', variant: 'destructive' });
      return;
    }
    setSaving(request.id);
    const missing = [
      !form.release_date && 'release_date',
      !form.cover_art_url && 'cover_art_url',
      !form.genre && 'genre',
      !form.primary_language && 'primary_language',
      form.explicit_content === undefined && 'explicit_content',
      !form.copyright_info && 'copyright_info',
    ].filter(Boolean) as string[];
    const { error } = await (supabase as any)
      .from('release_metadata_completion_requests')
      .update({
        release_date: form.release_date,
        cover_art_url: form.cover_art_url,
        genre: form.genre || null,
        primary_language: form.primary_language || null,
        explicit_content: form.explicit_content ?? false,
        copyright_info: form.copyright_info || null,
        songwriter_credits: form.songwriter_credits || null,
        producer_credits: form.producer_credits || null,
        artwork_credits: form.artwork_credits || null,
        description: form.description || null,
        territory: form.territory || 'Worldwide',
        missing_fields: missing,
        metadata_answers: { submitted_by: user?.id, submitted_at: new Date().toISOString() },
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id);
    if (error) {
      toast({ title: 'Could not submit metadata', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Metadata submitted', description: 'Our distribution team will verify the details and finish matching this release.' });
      await loadRequests();
    }
    setSaving(null);
  };

  if (loading) return <div className="container mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading release metadata requests…</div>;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary mb-2">Action required</p>
        <h1 className="text-3xl font-bold text-foreground">Complete your release details</h1>
        <p className="mt-2 text-muted-foreground max-w-3xl">We found royalty statement products that need verified release information before we can safely complete their catalogue records. Please provide the official release date and original cover artwork, then review the other metadata below.</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="text-xl font-semibold">You're all caught up</h2>
          <p className="mt-2 text-muted-foreground">There are no release metadata requests assigned to your account right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => {
            const form = values[request.id] || {};
            return (
              <section key={request.id} className="rounded-xl border bg-card p-5 sm:p-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Music2 className="h-4 w-4" />{request.artist_name}</div>
                    <h2 className="mt-1 text-xl font-semibold">{request.release_title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{request.release_type.toUpperCase()} · UPC: {request.upc || 'Not provided'}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-medium self-start">Needs your details</span>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-2">Tracks identified from the royalty statement</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {request.required_tracks?.map((track, index) => <li key={`${track.title}-${index}`}>{index + 1}. {track.title}{track.isrc ? ` — ISRC ${track.isrc}` : ''}</li>)}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Official release date *</Label>
                    <Input type="date" value={String(form.release_date || '')} onChange={(e) => setField(request.id, 'release_date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Input placeholder="e.g. Afrobeats" value={String(form.genre || '')} onChange={(e) => setField(request.id, 'genre', e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Original cover artwork *</Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input value={String(form.cover_art_url || '')} onChange={(e) => setField(request.id, 'cover_art_url', e.target.value)} placeholder="Artwork URL (or upload an image below)" />
                      <label className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm cursor-pointer hover:bg-muted">
                        <Upload className="h-4 w-4" />{uploading === request.id ? 'Uploading…' : 'Upload artwork'}
                        <input className="hidden" type="file" accept="image/*" disabled={uploading === request.id} onChange={(e) => { void uploadArtwork(request.id, e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      </label>
                    </div>
                    {form.cover_art_url && <img src={String(form.cover_art_url)} alt={`${request.release_title} artwork preview`} className="h-36 w-36 rounded-lg object-cover border" />}
                  </div>
                  <div className="space-y-2">
                    <Label>Primary language</Label>
                    <Input placeholder="e.g. English, Yoruba" value={String(form.primary_language || '')} onChange={(e) => setField(request.id, 'primary_language', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div><Label>Explicit content</Label><p className="text-xs text-muted-foreground">Mark if lyrics contain explicit content.</p></div>
                    <Switch checked={Boolean(form.explicit_content)} onCheckedChange={(v) => setField(request.id, 'explicit_content', v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Copyright line</Label>
                    <Input placeholder="℗ / © owner and year" value={String(form.copyright_info || '')} onChange={(e) => setField(request.id, 'copyright_info', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Territory</Label>
                    <Input placeholder="Worldwide" value={String(form.territory || '')} onChange={(e) => setField(request.id, 'territory', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Songwriter credits</Label>
                    <Input value={String(form.songwriter_credits || '')} onChange={(e) => setField(request.id, 'songwriter_credits', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Producer credits</Label>
                    <Input value={String(form.producer_credits || '')} onChange={(e) => setField(request.id, 'producer_credits', e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Artwork credits</Label>
                    <Input value={String(form.artwork_credits || '')} onChange={(e) => setField(request.id, 'artwork_credits', e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Release description (optional)</Label>
                    <Textarea value={String(form.description || '')} onChange={(e) => setField(request.id, 'description', e.target.value)} rows={3} />
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />Use the actual release date and approved artwork already associated with this product. Submitting these details sends them for verification; it does not immediately publish or alter streaming-store metadata.</div>
                <div className="flex justify-end"><Button onClick={() => void submit(request)} disabled={saving === request.id || uploading === request.id}>{saving === request.id ? 'Submitting…' : 'Submit details for verification'}</Button></div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default ReleaseMetadataCompletion;
