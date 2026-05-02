import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Aggregate earnings per artist for this upload
    const { data: earnings } = await supabase
      .from("monthly_artist_earnings")
      .select("artist_id, total_earnings, total_streams, currency")
      .eq("upload_id", upload_id);

    if (!earnings || earnings.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No earnings to notify" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const artistIds = [...new Set(earnings.map((e: any) => e.artist_id))];
    const { data: artists } = await supabase
      .from("artists")
      .select("id, name, email")
      .in("id", artistIds);

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

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Royalty Earnings</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0;">${periodText}</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #334155;">Hello <strong>${artist.name}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">Your royalty earnings for <strong>${periodText}</strong> have been processed and added to your available balance.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${periodText}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Total Streams</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${totalStreams.toLocaleString()}</td></tr>
                <tr style="border-top: 2px solid #e2e8f0;"><td style="padding: 12px 0; color: #64748b; font-size: 18px;">New Earnings</td><td style="padding: 12px 0; font-weight: bold; text-align: right; font-size: 20px; color: #16a34a;">$${totalAmount.toFixed(2)} ${currency}</td></tr>
              </table>
            </div>
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
            subject: `Your ${periodText} Royalty Earnings — $${totalAmount.toFixed(2)}`,
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
