import { supabase } from '@/integrations/supabase/client';
import type { OnerpmRow } from '@/utils/onerpmCsvParser';

export interface RoyaltyUpload {
  id: string;
  file_name: string;
  period_label: string;
  period_year: number;
  period_month: number;
  uploaded_by: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  total_amount: number;
  currency: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export async function createUploadAndProcess(params: {
  fileName: string;
  year: number;
  month: number;
  rows: OnerpmRow[];
  skipZero?: boolean;
}): Promise<{ uploadId: string; matched: number; unmatched: number }> {
  // Always include zero-net rows (they're stored & flagged as zero_revenue)
  const { fileName, year, month, rows } = params;
  const filtered = rows;

  const totalAmount = filtered.reduce((s, r) => s + r.net_amount, 0);
  const currency = filtered[0]?.currency || 'USD';
  const periodLabel = `${year}-${String(month).padStart(2, '0')}`;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: upload, error: uErr } = await supabase
    .from('royalty_uploads')
    .insert({
      file_name: fileName,
      period_label: periodLabel,
      period_year: year,
      period_month: month,
      uploaded_by: user.id,
      total_rows: filtered.length,
      total_amount: totalAmount,
      currency,
      status: 'processing',
    })
    .select('id')
    .single();
  if (uErr) throw uErr;

  // Insert rows in chunks to avoid payload limits
  const chunkSize = 500;
  for (let i = 0; i < filtered.length; i += chunkSize) {
    const chunk = filtered.slice(i, i + chunkSize).map((r) => ({
      upload_id: upload.id,
      track_title: r.track_title,
      raw_artists: r.raw_artists,
      performer_names: r.performer_names,
      track_external_id: r.track_external_id,
      quantity: r.quantity,
      downloads: r.downloads ?? 0,
      net_amount: r.net_amount,
      currency: r.currency,
      sales_type: r.sales_type,
      dsp_name: r.dsp_name || null,
      country: r.country || null,
    }));
    const { error } = await supabase.from('royalty_upload_rows').insert(chunk);
    if (error) throw error;
  }

  const { data: result, error: pErr } = await supabase.rpc('process_royalty_upload', {
    p_upload_id: upload.id,
  });
  if (pErr) throw pErr;

  const r = (result as any) || {};

  // Notify artists of their new earnings (best-effort)
  try {
    await supabase.functions.invoke('send-royalty-upload-notification', {
      body: { upload_id: upload.id },
    });
  } catch (e) {
    console.warn('Royalty notification failed:', e);
  }

  return { uploadId: upload.id, matched: r.matched ?? 0, unmatched: r.unmatched ?? 0 };
}

export async function notifyArtistsForUpload(uploadId: string) {
  const { data, error } = await supabase.functions.invoke('send-royalty-upload-notification', {
    body: { upload_id: uploadId },
  });
  if (error) throw error;
  return data;
}

export async function fetchUploads(): Promise<RoyaltyUpload[]> {
  const { data, error } = await supabase
    .from('royalty_uploads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RoyaltyUpload[];
}

export async function fetchUnmatchedRows(uploadId: string) {
  const { data, error } = await supabase
    .from('royalty_upload_rows')
    .select('*')
    .eq('upload_id', uploadId)
    .eq('match_status', 'unmatched')
    .order('net_amount', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function assignRowToArtist(rowId: string, artistId: string) {
  // Set matched_artist_ids and re-run aggregation by reprocessing the parent upload
  const { data: row, error: rErr } = await supabase
    .from('royalty_upload_rows')
    .select('id, upload_id, net_amount')
    .eq('id', rowId)
    .single();
  if (rErr) throw rErr;

  await supabase
    .from('royalty_upload_rows')
    .update({
      matched_artist_ids: [artistId],
      match_status: 'matched',
      assigned_amount_per_artist: row.net_amount,
    })
    .eq('id', rowId);

  // Re-run aggregation for the entire upload (simplest correct path)
  await supabase.rpc('process_royalty_upload', { p_upload_id: row.upload_id });
}

export async function deleteUpload(uploadId: string) {
  const { error } = await supabase.from('royalty_uploads').delete().eq('id', uploadId);
  if (error) throw error;
}

export async function fetchMonthlyEarnings(artistId: string) {
  const { data, error } = await supabase
    .from('monthly_artist_earnings')
    .select('*')
    .eq('artist_id', artistId)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchArtistTrackBreakdown(artistId: string, year?: number, month?: number) {
  let q = supabase
    .from('royalty_upload_rows')
    .select('track_title, quantity, assigned_amount_per_artist, currency, upload_id, royalty_uploads!inner(period_year, period_month)')
    .contains('matched_artist_ids', [artistId]);
  if (year) q = q.eq('royalty_uploads.period_year', year);
  if (month) q = q.eq('royalty_uploads.period_month', month);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ---------- Monthly stream analytics helpers ----------

export async function checkMonthImported(year: number, month: number) {
  const { data, error } = await supabase.rpc('check_month_already_imported', {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  return (data || []) as Array<{ id: string; file_name: string; total_rows: number; total_amount: number; created_at: string }>;
}

export async function deleteMonthUploads(year: number, month: number) {
  const { data, error } = await supabase.rpc('delete_month_uploads', { p_year: year, p_month: month });
  if (error) throw error;
  return data as number;
}

export async function reprocessUpload(uploadId: string) {
  const { data, error } = await supabase.rpc('process_royalty_upload', { p_upload_id: uploadId });
  if (error) throw error;
  return data;
}

export async function fetchArtistStreamSummary(artistId: string) {
  const { data, error } = await supabase.rpc('get_artist_stream_summary', { p_artist_id: artistId });
  if (error) throw error;
  return (data || {}) as {
    lifetime_streams: number;
    lifetime_revenue: number;
    this_month_streams: number;
    previous_month_streams: number;
    growth_pct: number | null;
    top_track: string | null;
    top_dsp: string | null;
    top_country: string | null;
    monthly_revenue: number;
    avg_streams_per_release: number;
  };
}

export async function fetchArtistMonthlyStreams(artistId: string) {
  const { data, error } = await supabase
    .from('monthly_stream_stats')
    .select('period_year, period_month, streams, revenue, dsp_name, country, track_title, track_id, release_id')
    .eq('artist_id', artistId);
  if (error) throw error;
  return data || [];
}

export async function fetchTrackMonthlyStreams(trackId: string) {
  const { data, error } = await supabase
    .from('monthly_stream_stats')
    .select('period_year, period_month, streams, revenue, dsp_name, country')
    .eq('track_id', trackId);
  if (error) throw error;
  return data || [];
}

export async function fetchReleaseMonthlyStreams(releaseId: string) {
  const { data, error } = await supabase
    .from('monthly_stream_stats')
    .select('period_year, period_month, streams, revenue, dsp_name, country, track_title')
    .eq('release_id', releaseId);
  if (error) throw error;
  return data || [];
}

