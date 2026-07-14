import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Trash2, AlertTriangle, CheckCircle2, Mail, RotateCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { parseOnerpmCsv, type OnerpmRow } from '@/utils/onerpmCsvParser';
import {
  createUploadAndProcess,
  fetchUploads,
  fetchUnmatchedRows,
  assignRowToArtist,
  deleteUpload,
  notifyArtistsForUpload,
  checkMonthImported,
  deleteMonthUploads,
  reprocessUpload,
  type RoyaltyUpload,
} from '@/services/royaltyIngestionService';
import { supabase } from '@/integrations/supabase/client';

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December',
];

const RoyaltyUploadTab: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OnerpmRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<RoyaltyUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string; account_name: string | null }[]>([]);
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; existing: Array<{ id: string; file_name: string; created_at: string; total_amount: number }> }>({ open: false, existing: [] });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([
        fetchUploads(),
        supabase.from('artists').select('id, name, account_name').order('name'),
      ]);
      setUploads(u);
      setArtists((a.data as any[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const rows = await parseOnerpmCsv(f);
      setPreview(rows);
      toast.success(`Parsed ${rows.length} rows`);
    } catch (e: any) {
      toast.error('CSV parse failed: ' + (e.message || ''));
      setPreview([]);
    }
  };

  const runUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await createUploadAndProcess({ fileName: file.name, year, month, rows: preview });
      toast.success(`Processed: ${res.matched} matched, ${res.unmatched} unmatched. Artist notifications sent.`);
      setFile(null);
      setPreview([]);
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) {
      toast.error('Please select a CSV file');
      return;
    }
    try {
      const existing = await checkMonthImported(year, month);
      if (existing.length > 0) {
        setDuplicateDialog({ open: true, existing });
        return;
      }
    } catch (e: any) {
      toast.error(e.message || 'Duplicate check failed');
      return;
    }
    await runUpload();
  };

  const confirmReplaceMonth = async () => {
    setDuplicateDialog({ open: false, existing: [] });
    setUploading(true);
    try {
      await deleteMonthUploads(year, month);
      toast.success('Previous month replaced');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove previous month');
      setUploading(false);
      return;
    }
    setUploading(false);
    await runUpload();
  };

  const reprocess = async (id: string) => {
    try {
      await reprocessUpload(id);
      toast.success('Reprocessed');
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Reprocess failed');
    }
  };

  const openUnmatched = async (uploadId: string) => {
    setActiveUpload(uploadId);
    const rows = await fetchUnmatchedRows(uploadId);
    setUnmatched(rows);
  };

  const assign = async (rowId: string, artistId: string) => {
    try {
      await assignRowToArtist(rowId, artistId);
      toast.success('Assigned and reprocessed');
      if (activeUpload) {
        const rows = await fetchUnmatchedRows(activeUpload);
        setUnmatched(rows);
      }
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Assignment failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this upload? This will also remove all related earnings entries.')) return;
    try {
      await deleteUpload(id);
      toast.success('Upload deleted');
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const notify = async (id: string) => {
    try {
      const res: any = await notifyArtistsForUpload(id);
      toast.success(`Notifications sent to ${res?.sent ?? 0} artists`);
    } catch (e: any) {
      toast.error(e.message || 'Notification failed');
    }
  };

  const totalNet = preview.reduce((s, r) => {
    const v = Number(r.net_amount);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload ONErpm CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Earnings are matched to artists using their <strong>Account Name</strong>. Make sure each artist's account name matches the performer name in the CSV.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSV File</Label>
              <Input type="file" accept=".csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
            </div>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">{preview.length} rows</Badge>
                <Badge variant="outline">Total: ${totalNet.toFixed(2)}</Badge>
              </div>
              <div className="overflow-x-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Performers</TableHead>
                      <TableHead>Streams</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{r.track_title}</TableCell>
                        <TableCell className="text-xs">{r.performer_names.join(', ') || <span className="text-muted-foreground">none</span>}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell>${r.net_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.length > 10 && <p className="text-xs text-muted-foreground">Showing first 10 of {preview.length}</p>}
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload & Process
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No uploads yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Unmatched</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="max-w-[200px] truncate">{u.file_name}</TableCell>
                      <TableCell>{u.period_label}</TableCell>
                      <TableCell>{u.total_rows}</TableCell>
                      <TableCell><Badge className="bg-green-600 text-white">{u.matched_rows}</Badge></TableCell>
                      <TableCell>
                        {u.unmatched_rows > 0
                          ? <Button variant="link" size="sm" onClick={() => openUnmatched(u.id)}>{u.unmatched_rows}</Button>
                          : <Badge variant="outline">0</Badge>}
                      </TableCell>
                      <TableCell>${Number(u.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {u.status === 'completed'
                          ? <Badge className="bg-green-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>
                          : <Badge variant="secondary">{u.status}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => notify(u.id)} title="Resend artist notifications">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(u.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {activeUpload && unmatched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Rows — Manual Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Raw Artists</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Assign To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatched.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[150px] truncate">{r.track_title}</TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">{r.raw_artists}</TableCell>
                      <TableCell>${Number(r.net_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Select onValueChange={(v) => assign(r.id, v)}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Pick artist..." /></SelectTrigger>
                          <SelectContent>
                            {artists.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.account_name || a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoyaltyUploadTab;
