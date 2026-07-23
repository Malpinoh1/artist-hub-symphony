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
import { parseRoyaltyFile, DISTRIBUTOR_NAMES, type NormalizedRoyaltyRow, type DistributorCode } from '@/utils/royalty-parsers';
import {
  createUploadAndProcess,
  fetchUploads,
  fetchUnmatchedRows,
  assignRowToArtist,
  deleteUpload,
  notifyArtistsForUpload,
  checkMonthImportedForDistributor,
  deleteMonthUploadsForDistributor,
  reprocessUpload,
  rebuildAllStreamStats,
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
  const [preview, setPreview] = useState<NormalizedRoyaltyRow[]>([]);
  const [distributor, setDistributor] = useState<DistributorCode | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<RoyaltyUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string; account_name: string | null }[]>([]);
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; existing: Array<{ id: string; file_name: string; created_at: string; total_amount: number }> }>({ open: false, existing: [] });
  const [rebuilding, setRebuilding] = useState(false);

  const handleRebuild = async () => {
    if (!confirm('Rebuild all historical stream statistics from existing royalty uploads? This may take a moment but is safe to run.')) return;
    setRebuilding(true);
    try {
      const res = await rebuildAllStreamStats();
      toast.success(`Rebuild complete: ${res.reprocessed} uploads reprocessed${res.failed ? `, ${res.failed} failed` : ''}`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  };

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
    setPreview([]);
    setDistributor(null);
    try {
      const result = await parseRoyaltyFile(f);
      setPreview(result.rows);
      setDistributor(result.distributor_code);
      if (result.detected_period) {
        setYear(result.detected_period.year);
        setMonth(result.detected_period.month);
      }
      toast.success(`Detected ${DISTRIBUTOR_NAMES[result.distributor_code]} — parsed ${result.rows.length} rows`);
    } catch (e: any) {
      toast.error('Parse failed: ' + (e.message || ''));
    }
  };

  const runUpload = async () => {
    if (!file || !distributor) return;
    setUploading(true);
    try {
      const res = await createUploadAndProcess({ fileName: file.name, year, month, rows: preview, distributorCode: distributor });
      toast.success(`Processed: ${res.matched} matched, ${res.unmatched} unmatched. Artist notifications sent.`);
      setFile(null);
      setPreview([]);
      setDistributor(null);
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0 || !distributor) {
      toast.error('Please select a royalty statement (CSV or XLSX)');
      return;
    }
    try {
      const existing = await checkMonthImportedForDistributor(year, month, distributor);
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
    if (!distributor) return;
    setDuplicateDialog({ open: false, existing: [] });
    setUploading(true);
    try {
      await deleteMonthUploadsForDistributor(year, month, distributor);
      toast.success('Previous upload for this distributor replaced');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove previous upload');
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
            <Upload className="h-5 w-5" /> Upload Royalty Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Supports <strong>ONErpm</strong> and <strong>SoundOn</strong> statements (CSV or XLSX). The distributor is auto-detected from the file's headers. Rows are matched by ISRC → UPC → track title → artist account name.
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
              <Label>Statement File</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
            </div>
          </div>

          {preview.length > 0 && distributor && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge className="bg-primary text-primary-foreground">{DISTRIBUTOR_NAMES[distributor]}</Badge>
                <Badge variant="outline">{preview.length} rows</Badge>
                <Badge variant="outline">Total: ${totalNet.toFixed(2)}</Badge>
                <Badge variant="outline">{MONTHS[month - 1]} {year}</Badge>
              </div>
              <div className="overflow-x-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artists</TableHead>
                      <TableHead>ISRC / UPC</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{r.track_title}</TableCell>
                        <TableCell className="text-xs">{r.performer_names.join(', ') || <span className="text-muted-foreground">none</span>}</TableCell>
                        <TableCell className="text-xs font-mono">{r.isrc || r.upc || '—'}</TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell>${r.net_amount.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.length > 10 && <p className="text-xs text-muted-foreground">Showing first 10 of {preview.length}</p>}
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading || !file || !distributor} className="w-full">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload & Process
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Upload History
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding} title="Reprocess every past upload to rebuild historical stream stats (safe & idempotent)">
            {rebuilding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCw className="h-4 w-4 mr-2" />}
            Rebuild Historical Streams
          </Button>
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
                    <TableHead>Distributor</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">
                          {u.distributor_code ? (DISTRIBUTOR_NAMES[u.distributor_code as DistributorCode] || u.distributor_code) : '—'}
                        </Badge>
                      </TableCell>
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
                          <Button variant="ghost" size="sm" onClick={() => reprocess(u.id)} title="Reprocess this upload">
                            <RotateCw className="h-4 w-4" />
                          </Button>
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
                    <TableHead>ISRC</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Assign To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatched.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[150px] truncate">{r.track_title}</TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate">{r.raw_artists}</TableCell>
                      <TableCell className="text-xs font-mono">{r.isrc || '—'}</TableCell>
                      <TableCell>${Number(r.net_amount).toFixed(4)}</TableCell>
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

      <AlertDialog open={duplicateDialog.open} onOpenChange={(o) => !o && setDuplicateDialog({ open: false, existing: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This distributor already has an upload for this month</AlertDialogTitle>
            <AlertDialogDescription>
              {distributor ? DISTRIBUTOR_NAMES[distributor] : 'This distributor'} already has {duplicateDialog.existing.length} upload
              {duplicateDialog.existing.length > 1 ? 's' : ''} for {MONTHS[month - 1]} {year}. Choose <strong>Replace Existing</strong> to remove it and import the new file, or cancel.
              <ul className="mt-3 text-xs space-y-1 list-disc pl-4">
                {duplicateDialog.existing.map((e) => (
                  <li key={e.id}>{e.file_name} — ${Number(e.total_amount).toFixed(2)} — {new Date(e.created_at).toLocaleDateString()}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Uploads from other distributors for the same month are unaffected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel Upload</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplaceMonth} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Replace Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoyaltyUploadTab;
