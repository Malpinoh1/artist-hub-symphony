import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { artistId, year, month } = await req.json();
    if (!artistId || !year || !month) throw new Error('artistId, year, month required');

    const { data: artist } = await supabase
      .from('artists').select('name, account_name').eq('id', artistId).maybeSingle();

    const { data: agg } = await supabase
      .from('monthly_artist_earnings')
      .select('*')
      .eq('artist_id', artistId)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle();

    if (!agg) {
      return new Response(JSON.stringify({ pdfUrl: null, message: 'No earnings for that period' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: rows } = await supabase
      .from('royalty_upload_rows')
      .select('track_title, quantity, assigned_amount_per_artist, royalty_uploads!inner(period_year, period_month)')
      .contains('matched_artist_ids', [artistId])
      .eq('royalty_uploads.period_year', year)
      .eq('royalty_uploads.period_month', month);

    const tracks = (rows || []) as any[];
    const periodLabel = `${MONTHS[month - 1]} ${year}`;
    const accountName = artist?.account_name || artist?.name || 'Artist';
    const stmtNumber = `MS-${year}${String(month).padStart(2,'0')}-${artistId.slice(0,8).toUpperCase()}`;

    const pdf = buildPdf({
      accountName,
      periodLabel,
      stmtNumber,
      totalStreams: agg.total_streams,
      totalEarnings: Number(agg.total_earnings),
      tracks,
    });

    const fileName = `monthly-${stmtNumber}.pdf`;
    const path = `royalty-statements/${artistId}/${fileName}`;
    const { error: upErr } = await supabase.storage.from('releases').upload(path, pdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage.from('releases').getPublicUrl(path);

    return new Response(JSON.stringify({ pdfUrl: publicUrl, fileName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('generate-monthly-statement error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

interface PdfArgs {
  accountName: string;
  periodLabel: string;
  stmtNumber: string;
  totalStreams: number;
  totalEarnings: number;
  tracks: { track_title: string; quantity: number; assigned_amount_per_artist: number }[];
}

function escapePdf(s: string) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').slice(0, 80);
}

function buildPdf(a: PdfArgs): Uint8Array {
  const lines: string[] = [];
  lines.push('BT', '/F2 22 Tf', '0.2 0.4 0.9 rg', '50 770 Td', '(MALPINOHdistro) Tj');
  lines.push('0 0 0 rg', '/F2 16 Tf', '0 -28 Td', '(ROYALTY STATEMENT) Tj');
  lines.push('/F1 11 Tf', '0 -22 Td', `(Statement #: ${escapePdf(a.stmtNumber)}) Tj`);
  lines.push('0 -16 Td', `(Generated: ${escapePdf(new Date().toLocaleDateString('en-US'))}) Tj`);
  lines.push('/F2 13 Tf', '0 -30 Td', '(Artist) Tj', '/F1 12 Tf', '0 -16 Td', `(${escapePdf(a.accountName)}) Tj`);
  lines.push('/F2 13 Tf', '0 -22 Td', '(Period) Tj', '/F1 12 Tf', '0 -16 Td', `(${escapePdf(a.periodLabel)}) Tj`);
  lines.push('/F2 13 Tf', '0 -28 Td', '(Summary) Tj');
  lines.push('/F1 12 Tf', '0 -16 Td', `(Total Streams: ${a.totalStreams.toLocaleString()}) Tj`);
  lines.push('0 -14 Td', `(Total Earnings: $${a.totalEarnings.toFixed(2)}) Tj`);
  lines.push('/F2 13 Tf', '0 -28 Td', '(Track Breakdown) Tj', '/F2 11 Tf', '0 -18 Td', '(Title                                Streams        Earnings) Tj');
  lines.push('/F1 10 Tf');

  const max = Math.min(a.tracks.length, 30);
  for (let i = 0; i < max; i++) {
    const t = a.tracks[i];
    const title = (t.track_title || 'Unknown').padEnd(40, ' ').slice(0, 40);
    const qty = String(t.quantity || 0).padStart(8, ' ');
    const amt = `$${Number(t.assigned_amount_per_artist || 0).toFixed(2)}`.padStart(12, ' ');
    lines.push('0 -14 Td', `(${escapePdf(title + qty + amt)}) Tj`);
  }
  if (a.tracks.length > max) {
    lines.push('0 -16 Td', `(... and ${a.tracks.length - max} more tracks) Tj`);
  }
  lines.push('/F2 12 Tf', '0 -24 Td', `(GRAND TOTAL: $${a.totalEarnings.toFixed(2)}) Tj`);
  lines.push('/F1 9 Tf', '0.4 0.4 0.4 rg', '0 -40 Td', '(MALPINOHdistro - Digital Music Distribution) Tj');
  lines.push('ET');

  const stream = lines.join('\n');
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 7
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000110 00000 n
0000000230 00000 n
0000000${(330 + stream.length).toString().padStart(3, '0')} 00000 n
0000000${(395 + stream.length).toString().padStart(3, '0')} 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${470 + stream.length}
%%EOF`;
  return new TextEncoder().encode(pdf);
}
