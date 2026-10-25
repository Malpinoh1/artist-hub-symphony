import React, { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, CirclePause, ImageIcon, Loader2, Play, RefreshCw, ScanSearch, ShieldCheck } from 'lucide-react';

type ArtworkObject = { bucket: string; path: string; size: number; contentType: string; status: 'pending'|'uploaded'|'done'|'failed'|'skipped'|'preview-ready'|'conflict'|'preview-failed'; error?: string; newSize?: number };
type ScanResult = { buckets: string[]; objects: ArtworkObject[]; totalBytes: number };

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
};

const ArtworkOptimizerTab: React.FC = () => {
  const [dryRun, setDryRun] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState<ArtworkObject[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const stopRef = useRef(false);
  const itemsRef = useRef<ArtworkObject[]>([]);
  const updateItems = (next: ArtworkObject[] | ((prev: ArtworkObject[]) => ArtworkObject[])) => {
    setItems(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      itemsRef.current = value;
      return value;
    });
  };

  const callOptimizer = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('artwork-optimizer', { body });
    if (invokeError) throw new Error(invokeError.message || 'Artwork optimizer request failed');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const scan = useCallback(async () => {
    setScanning(true); setError('');
    try {
      const data = await callOptimizer({ action: 'scan' }) as ScanResult;
      setBuckets(data.buckets || []);
      updateItems((data.objects || []).map(item => ({ ...item, status: 'pending' as const })));
      setActiveIndex(0);
      toast.success(`Found ${data.objects?.length || 0} image files`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not scan Storage';
      setError(message); toast.error(message);
    } finally { setScanning(false); }
  }, [callOptimizer]);

  const convertOne = async (item: ArtworkObject) => {
    const signed = await callOptimizer({ action: 'signed-url', bucket: item.bucket, path: item.path });
    if (!signed?.signedUrl) throw new Error('Cannot read original: signed URL unavailable');
    const response = await fetch(signed.signedUrl);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    if (item.path.toLowerCase().endsWith('.webp') && blob.type === 'image/webp') return { skipped: true as const, newSize: blob.size };
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image conversion canvas is unavailable');
      ctx.drawImage(bitmap, 0, 0);
      const webp = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('WebP encoding failed')), 'image/webp', 0.86));
      if (!webp.size) throw new Error('Converted image is empty');
      if (webp.size >= blob.size && blob.type === 'image/webp') {
        // Already WebP: leave it untouched instead of creating another copy.
        return { skipped: true as const, newSize: blob.size };
      }
      const newPath = item.path.replace(/\.[^/.]+$/, '') + '.webp';
      const bytes = new Uint8Array(await webp.arrayBuffer());
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      const base64 = btoa(binary);
      const uploaded = await callOptimizer({ action: 'upload', bucket: item.bucket, originalPath: item.path, newPath, base64, size: webp.size });
      if (!uploaded?.uploaded) throw new Error('WebP upload was not confirmed');

      // Verify the replacement can be read back and is a WebP before references are changed.
      const verify = await callOptimizer({ action: 'signed-url', bucket: item.bucket, path: newPath });
      if (!verify?.signedUrl) throw new Error('Replacement uploaded but could not be verified');
      const verifyResponse = await fetch(verify.signedUrl);
      if (!verifyResponse.ok) throw new Error('Replacement verification download failed');
      const verifyBlob = await verifyResponse.blob();
      if (verifyBlob.type !== 'image/webp' || verifyBlob.size !== webp.size) throw new Error('Replacement verification failed: unexpected type or size');

      const finalized = await callOptimizer({ action: 'finalize', bucket: item.bucket, originalPath: item.path, newPath });
      if (!finalized?.referencesUpdated || !finalized?.originalDeleted) {
        throw new Error(finalized?.error || 'Reference update or original deletion was not confirmed; original retained');
      }
      return { skipped: false as const, newSize: webp.size };
    } finally { bitmap.close(); }
  };

  const runDryPreview = async () => {
    if (!itemsRef.current.length) return;
    setRunning(true); setPaused(false); stopRef.current = false;
    try {
      for (let i = 0; i < itemsRef.current.length; i++) {
        if (stopRef.current) break;
        const item = itemsRef.current[i];
        setActiveIndex(i);
        updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'pending', error: undefined, newSize: undefined } : x));
        try {
          const signed = await callOptimizer({ action: 'signed-url', bucket: item.bucket, path: item.path });
          if (!signed?.signedUrl) throw new Error('Cannot read original: signed URL unavailable');
          const response = await fetch(signed.signedUrl);
          if (!response.ok) throw new Error(`Download failed (${response.status})`);
          const blob = await response.blob();
          if (item.path.toLowerCase().endsWith('.webp') && blob.type === 'image/webp') {
            updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'skipped', newSize: blob.size } : x));
            continue;
          }
          const newPath = item.path.replace(/\\.[^/.]+$/, '') + '.webp';
          const slash = newPath.lastIndexOf('/');
          const parent = slash >= 0 ? newPath.slice(0, slash) : '';
          const filename = slash >= 0 ? newPath.slice(slash + 1) : newPath;
          const { data: siblings, error: listError } = await supabase.storage.from(item.bucket).list(parent, { search: filename, limit: 10 });
          if (listError) throw new Error('Could not check the destination safely; no changes were made');
          if ((siblings ?? []).some(entry => entry.name === filename)) {
            updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'conflict', error: 'A WebP destination already exists; it will not be overwritten' } : x));
            continue;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Preview failed';
          updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'preview-failed', error: message } : x));
        }
      }
      toast.success('Dry preview complete. No files were changed.');
    } finally { setRunning(false); setPaused(stopRef.current); }
  };

  const start = async () => {
    if (!items.length) return;
    setRunning(true); setPaused(false); stopRef.current = false; setError('');
    try {
      for (let i = 0; i < itemsRef.current.length; i++) {
        if (stopRef.current) break;
        const item = itemsRef.current[i];
        if (item.status === 'done' || item.status === 'skipped') continue;
        setActiveIndex(i);
        if (dryRun) continue;
        updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'pending', error: undefined } : x));
        try {
          const result = await convertOne(item);
          updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: result.skipped ? 'skipped' : 'done', newSize: result.newSize, error: undefined } : x));
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Conversion failed';
          updateItems(prev => prev.map((x, index) => index === i ? { ...x, status: 'failed', error: message } : x));
        }
      }
      if (dryRun) toast.success('Dry run complete. No files were changed.');
      else toast.success(stopRef.current ? 'Paused. You can resume or retry failed files.' : 'Artwork batch finished');
    } finally { setRunning(false); setPaused(stopRef.current); }
  };

  const pause = () => { stopRef.current = true; setPaused(true); };
  const retryFailed = () => {
    updateItems(prev => prev.map(item => item.status === 'failed' ? { ...item, status: 'pending', error: undefined } : item));
    setTimeout(() => { void start(); }, 0);
  };

  const completed = items.filter(x => x.status === 'done' || x.status === 'skipped').length;
  const failed = items.filter(x => x.status === 'failed').length;
  const savedBytes = items.reduce((sum, item) => sum + (item.status === 'done' && item.newSize != null ? Math.max(0, item.size - item.newSize) : 0), 0);
  const progress = items.length ? Math.round((completed + failed) / items.length * 100) : 0;
  const preview = useMemo(() => items.slice(0, 100), [items]);

  return <div className="space-y-5">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-primary/10 p-3"><ImageIcon className="h-6 w-6 text-primary" /></div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold">Artwork Optimizer</h2>
        <p className="text-sm text-muted-foreground">Convert stored images to WebP, verify replacements, update known image URL references, then remove originals. Admin-only operation.</p>
      </div>
    </div>
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <div className="flex gap-2 font-medium"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /> Start with a dry run</div>
      <p className="mt-1 text-muted-foreground">Dry preview reads each image, estimates WebP size, checks destination conflicts, and makes no changes. Live conversion is destructive after verification. Take a database backup first.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void scan()} disabled={scanning || running} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50">
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />} Scan all buckets
      </button>
      <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
        <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} disabled={running} />
        Dry run (no changes)
      </label>
      {!running ? <button type="button" onClick={() => void start()} disabled={!items.length || scanning} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        <Play className="h-4 w-4" /> {dryRun ? 'Run dry preview' : paused ? 'Resume batch' : 'Start conversion'}
      </button> : <button type="button" onClick={pause} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><CirclePause className="h-4 w-4" /> Pause after current file</button>}
      <button type="button" onClick={retryFailed} disabled={running || failed === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Retry failed ({failed})</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {items.length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Image files found" value={items.length.toLocaleString()} />
        <Metric label="Original storage" value={formatBytes(items.reduce((sum, x) => sum + x.size, 0))} />
        <Metric label="Verified savings" value={formatBytes(savedBytes)} />
        <Metric label="Completed / failed" value={`${completed} / ${failed}`} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span>Batch progress</span><span>{progress}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="text-xs text-muted-foreground">Current item: {items[activeIndex]?.path || 'Waiting'} · Buckets scanned: {buckets.join(', ') || '—'}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/50"><tr><th className="p-3">Bucket / object</th><th className="p-3">Original</th><th className="p-3">WebP</th><th className="p-3">Status</th></tr></thead>
          <tbody>{preview.map(item => <tr key={item.bucket + '/' + item.path} className="border-t">
            <td className="max-w-[360px] p-3"><div className="font-medium">{item.bucket}</div><div className="break-all text-xs text-muted-foreground">{item.path}</div></td>
            <td className="p-3">{formatBytes(item.size)}</td><td className="p-3">{item.newSize == null ? '—' : formatBytes(item.newSize)}</td>
            <td className="p-3"><Status item={item} /></td>
          </tr>)}</tbody>
        </table>
        {items.length > 100 && <p className="p-3 text-xs text-muted-foreground">Showing first 100 of {items.length} files.</p>}
      </div>
    </>}
    <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Images are processed one at a time. If a replacement or reference update cannot be verified, the original should be retained for manual retry.</div>
  </div>;
};

const Metric = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>;
const Status = ({ item }: { item: ArtworkObject }) => {
  const cls = item.status === 'done' ? 'text-emerald-600' : item.status === 'failed' ? 'text-destructive' : item.status === 'skipped' ? 'text-muted-foreground' : 'text-foreground';
  return <span className={`inline-flex items-center gap-1 ${cls}`}>{item.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : item.status === 'failed' ? <AlertTriangle className="h-4 w-4" /> : null}{item.status}{item.error ? <span title={item.error}> · {item.error}</span> : null}</span>;
};

export default ArtworkOptimizerTab;
