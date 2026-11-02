import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] as string));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: "upload_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: upload } = await supabase
      .from("royalty_uploads")
      .select("period_year, period_month, period_label")
      .eq("id", upload_id).maybeSingle();

    if (!upload) {
      return new Response(JSON.stringify({ error: "Upload not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: earnings, error: earningsError } = await supabase
      .from("monthly_artist_earnings")
      .select("artist_id, total_earnings, total_streams, currency")
      .eq("upload_id", upload_id);
    if (earningsError) throw earningsError;

    if (!earnings || earnings.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No earnings to notify" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const artistIds = [...new Set(earnings.map((e: any) => e.artist_id))];
    const { data: artists, error: artistsError } = await supabase
      .from("artists")
      .select("id, name, email")
      .in("id", artistIds);
    if (artistsError) throw artistsError;

    const { data: trackStats, error: statsError } = await supabase
      .from("monthly_stream_stats")
      .select("artist_id, track_id, track_title, revenue, currency")
      .eq("upload_id", upload_id)
      .in("artist_id", artistIds);
    if (statsError) throw statsError;

    const monthName = new Date(upload.period_year, upload.period_month - 1, 1)
      .toLocaleString("en-US", { month: "long" });
    const periodText = `${monthName} ${upload.period_year}`;
    const results: any[] = [];

    for (const artist of artists || []) {
      if (!artist.email) continue;
      const artistEarnings = earnings.filter((e: any) => e.artist_id === artist.id);
      const totalAmount = artistEarnings.reduce((s: number, e: any) => s + Number(e.total_earnings || 0), 0);
      const totalStreams = artistEarnings.reduce((s: number, e: any) => s + Number(e.total_streams || 0), 0);
      const currency = artistEarnings[0]?.currency || "USD";
      if (totalAmount <= 0) continue;

      const byTrack = new Map<string, { trackId: string | null; title: string; amount: number; currency: string }>();
      for (const stat of (trackStats || []).filter((row: any) => row.artist_id === artist.id)) {
        const key = stat.track_id || stat.track_title || "unknown";
        const current = byTrack.get(key) || {
          trackId: stat.track_id, title: stat.track_title || "Track royalty", amount: 0, currency: stat.currency || currency,
        };
        current.amount += Number(stat.revenue || 0);
        byTrack.set(key, current);
      }

      const trackRows: string[] = [];
      for (const track of byTrack.values()) {
        let shareLabel = "Royalty credited";
        if (track.trackId) {
          const { data: splitRecipient } = await supabase
            .from("split_recipients")
            .select("percentage, splits!inner(track_id, status)")
            .eq("artist_id", artist.id)
            .eq("status", "accepted")
            .eq("splits.track_id", track.trackId)
            .in("splits.status", ["active", "locked"])
            .maybeSingle();
          if (splitRecipient?.percentage !== undefined && splitRecipient?.percentage !== null) {
            shareLabel = `Your split: ${Number(splitRecipient.percentage).toFixed(2)}%`;
          }
        }
        trackRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(track.title)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;">${escapeHtml(shareLabel)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;">${Number(track.amount).toFixed(2)} ${escapeHtml(track.currency)}</td></tr>`);
      }

      const trackBreakdown = trackRows.length ? `
        <h3 style="color:#334155;margin:24px 0 8px;">Your track shares</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;">
          <thead><tr><th style="text-align:left;padding:8px;">Track</th><th style="text-align:right;padding:8px;">Share</th><th style="text-align:right;padding:8px;">Credited</th></tr></thead>
          <tbody>${trackRows.join("")}</tbody>
        </table>` : "";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Royalty Earnings</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0;">${escapeHtml(periodText)}</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #334155;">Hello <strong>${escapeHtml(artist.name)}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">Your royalty earnings for <strong>${escapeHtml(periodText)}</strong> have been processed and added to your available balance. This includes any accepted royalty split shares assigned to your account.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(periodText)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Total Streams</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${totalStreams.toLocaleString()}</td></tr>
                <tr style="border-top: 2px solid #e2e8f0;"><td style="padding: 12px 0; color: #64748b; font-size: 18px;">New Earnings</td><td style="padding: 12px 0; font-weight: bold; text-align: right; font-size: 20px; color: #16a34a;">${totalAmount.toFixed(2)} ${escapeHtml(currency)}</td></tr>
              </table>
            </div>
            ${trackBreakdown}
            <p style="font-size: 14px; color: #64748b;">Log in to your dashboard to view a full breakdown and download your statement.</p>
            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">Thank you,<br/><strong>MALPINOHDISTRO</strong></p>
          </div>
        </div>
      `;

      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: { name: "MALPINOHDISTRO", email: "no-reply@malpinohdistro.com.ng" },
            to: [{ email: artist.email, name: artist.name }],
            subject: `Your ${periodText} Royalty Earnings — ${totalAmount.toFixed(2)} ${currency}`,
            htmlContent: html,
          }),
        });
        const result = await res.json();
        results.push({ email: artist.email, success: res.ok, error: res.ok ? undefined : result.message });
      } catch (e: any) {
        results.push({ email: artist.email, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: results.filter(r => r.success).length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
