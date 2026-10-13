import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const artistId = String(body.artistId || "");
    const year = Number(body.year);
    const month = Number(body.month);
    if (!artistId || !Number.isInteger(year) || year < 2000 || year > 2200 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("A valid artistId, year, and month are required");
    }

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("name, account_name")
      .eq("id", artistId)
      .maybeSingle();
    if (artistError) throw artistError;
    if (!artist) throw new Error("Artist account not found");

    const { data: earningsRows, error: earningsError } = await supabase
      .from("monthly_artist_earnings")
      .select("total_streams, total_earnings, currency")
      .eq("artist_id", artistId)
      .eq("period_year", year)
      .eq("period_month", month);
    if (earningsError) throw earningsError;
    if (!earningsRows || earningsRows.length === 0) {
      return jsonResponse({ pdfUrl: null, message: "No earnings for that period" }, 200);
    }

    const { data: rows, error: rowsError } = await supabase
      .from("royalty_upload_rows")
      .select("track_title, quantity, sales_type, dsp_name, distributor_code, assigned_amount_per_artist, currency, royalty_uploads!inner(period_year, period_month)")
      .contains("matched_artist_ids", [artistId])
      .eq("royalty_uploads.period_year", year)
      .eq("royalty_uploads.period_month", month)
      .order("track_title", { ascending: true });
    if (rowsError) throw rowsError;

    const totalStreams = earningsRows.reduce((sum, row) => sum + Number(row.total_streams || 0), 0);
    const totalEarnings = earningsRows.reduce((sum, row) => sum + Number(row.total_earnings || 0), 0);
    const currency = String(earningsRows.find((row) => row.currency)?.currency || "USD").toUpperCase();
    const periodLabel = MONTHS[month - 1] + " " + year;
    const accountName = artist.account_name || artist.name || "Artist";
    const stmtNumber = "MS-" + year + String(month).padStart(2, "0") + "-" + artistId.slice(0, 8).toUpperCase();

    const pdf = buildPdf({
      accountName,
      periodLabel,
      stmtNumber,
      totalStreams,
      totalEarnings,
      currency,
      tracks: (rows || []).map((row: any) => ({
        track_title: row.track_title || "Unknown track",
        quantity: Number(row.quantity || 0),
        sales_type: row.sales_type || "Unspecified",
        dsp_name: row.dsp_name || "",
        distributor_code: row.distributor_code || "",
        assigned_amount_per_artist: Number(row.assigned_amount_per_artist || 0),
        currency: row.currency || currency,
      })),
    });

    const fileName = "monthly-" + stmtNumber + ".pdf";
    const path = "royalty-statements/" + artistId + "/" + fileName;
    const { error: uploadError } = await supabase.storage.from("releases").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "0",
    });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("releases").getPublicUrl(path);
    return jsonResponse({ pdfUrl: publicData.publicUrl, fileName, totalStreams, totalEarnings, currency, rowCount: (rows || []).length }, 200);
  } catch (error: any) {
    console.error("generate-monthly-statement error:", error);
    return jsonResponse({ error: error?.message || "Statement generation failed" }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

interface StatementTrack {
  track_title: string;
  quantity: number;
  sales_type: string;
  dsp_name: string;
  distributor_code: string;
  assigned_amount_per_artist: number;
  currency: string;
}

interface PdfArgs {
  accountName: string;
  periodLabel: string;
  stmtNumber: string;
  totalStreams: number;
  totalEarnings: number;
  currency: string;
  tracks: StatementTrack[];
}

function ascii(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdf(value: unknown): string {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(value: number, currency: string): string {
  return currency + " " + Number(value || 0).toFixed(4);
}

function buildPdf(a: PdfArgs): Uint8Array {
  const rows = a.tracks || [];
  const pages: Array<Array<{ text: string; bold?: boolean; size?: number; x?: number }>> = [];
  const firstPageLines: Array<{ text: string; bold?: boolean; size?: number; x?: number }> = [
    { text: "MALPINOHdistro", bold: true, size: 20 },
    { text: "ROYALTY STATEMENT", bold: true, size: 14 },
    { text: "Statement number: " + a.stmtNumber },
    { text: "Artist/account: " + a.accountName },
    { text: "Reporting period: " + a.periodLabel },
    { text: "Generated: " + new Date().toISOString().slice(0, 10) },
    { text: "Summary: " + a.totalStreams.toLocaleString("en-US") + " eligible stream units | " + money(a.totalEarnings, a.currency) },
    { text: "Platform means the DSP/store named in the supplied royalty report. 'Not supplied' means the report did not identify one.", size: 8 },
    { text: "" },
    { text: "TRACK / TITLE                 ACTIVITY TYPE       PLATFORM             DISTRIBUTOR   UNITS       EARNINGS", bold: true, size: 8 },
    { text: "-".repeat(116), size: 8 },
  ];

  const formatRow = (track: StatementTrack) => {
    const isShareOut = /share\s*out/i.test(track.sales_type || "");
    const units = isShareOut ? 0 : Number(track.quantity || 0);
    const title = ascii(track.track_title || "Unknown track").slice(0, 29).padEnd(29, " ");
    const type = ascii(track.sales_type || "Unspecified").slice(0, 18).padEnd(18, " ");
    const platform = ascii(track.dsp_name || "Not supplied").slice(0, 20).padEnd(20, " ");
    const distributor = ascii(track.distributor_code || "Not supplied").toUpperCase().slice(0, 13).padEnd(13, " ");
    const unitText = units.toLocaleString("en-US").slice(0, 10).padStart(10, " ");
    const amount = Number(track.assigned_amount_per_artist || 0).toFixed(4).padStart(11, " ");
    return title + " " + type + " " + platform + " " + distributor + " " + unitText + " " + amount;
  };

  const firstCapacity = 23;
  const laterCapacity = 32;
  let index = 0;
  const firstRows = rows.slice(0, firstCapacity);
  pages.push(firstPageLines.concat(firstRows.map(formatRow)));
  index = firstRows.length;
  while (index < rows.length) {
    const chunk = rows.slice(index, index + laterCapacity);
    pages.push([
      { text: "MALPINOHdistro - ROYALTY STATEMENT - " + a.periodLabel, bold: true, size: 12 },
      { text: "Statement number: " + a.stmtNumber, size: 8 },
      { text: "TRACK / TITLE                 ACTIVITY TYPE       PLATFORM             DISTRIBUTOR   UNITS       EARNINGS", bold: true, size: 8 },
      { text: "-".repeat(116), size: 8 },
      ...chunk.map(formatRow),
    ]);
    index += chunk.length;
  }
  if (rows.length === 0) {
    pages[0].push({ text: "No line-item royalty rows were available for this period." });
  }
  pages[pages.length - 1].push({ text: "" }, { text: "Totals are based on monthly earnings records. Negative earnings are retained as signed adjustments.", size: 8 });

  const objects: string[] = [];
  const addObject = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    let y = 570;
    const commands: string[] = [];
    for (const line of pageLines) {
      const size = line.size || 10;
      const x = line.x ?? 35;
      if (line.text) {
        commands.push("BT /" + (line.bold ? "F2" : "F1") + " " + size + " Tf " + x + " " + y + " Td (" + escapePdf(line.text) + ") Tj ET");
      }
      y -= line.size === 20 ? 27 : line.size === 14 ? 21 : line.size === 12 ? 18 : line.size === 8 ? 11 : 15;
    }
    const stream = commands.join("\n") + "\n";
    const contentId = addObject("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
    const pageId = addObject("<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 " + regularFontId + " 0 R /F2 " + boldFontId + " 0 R >> >> /Contents " + contentId + " 0 R >>");
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
  objects[pagesId - 1] = "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(output.length);
    output += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = output.length;
  output += "xref\n0 " + (objects.length + 1) + "\n";
  output += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    output += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  output += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalogId + " 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";
  return new TextEncoder().encode(output);
}
