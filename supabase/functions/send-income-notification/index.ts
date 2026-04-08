import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artist_ids, track_title, platform_name, income_id } = await req.json();

    if (!artist_ids || !Array.isArray(artist_ids) || artist_ids.length === 0) {
      return new Response(JSON.stringify({ error: "artist_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get transactions for this income
    const { data: transactions } = await supabase
      .from("income_transactions")
      .select("artist_id, amount, type")
      .eq("income_id", income_id);

    // Get artist details
    const { data: artists } = await supabase
      .from("artists")
      .select("id, name, email")
      .in("id", artist_ids);

    if (!artists || artists.length === 0) {
      return new Response(JSON.stringify({ error: "No artists found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const artist of artists) {
      const tx = transactions?.find(t => t.artist_id === artist.id);
      const amount = tx ? tx.amount : 0;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Income Added</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #334155;">Hello <strong>${artist.name}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">A new income has been added to your balance.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b;">Track</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${track_title || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Platform</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${platform_name || 'N/A'}</td></tr>
                <tr style="border-top: 2px solid #e2e8f0;"><td style="padding: 12px 0; color: #64748b; font-size: 18px;">Amount</td><td style="padding: 12px 0; font-weight: bold; text-align: right; font-size: 18px; color: #16a34a;">$${Number(amount).toFixed(2)}</td></tr>
              </table>
            </div>
            <p style="font-size: 14px; color: #64748b;">Please log in to your account to review the details.</p>
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
            to: [{ email: artist.email }],
            subject: "New Income Added to Your Account",
            htmlContent: html,
          }),
        });
        const result = await res.json();
        results.push({ email: artist.email, success: res.ok, error: res.ok ? undefined : result.message });
      } catch (e: any) {
        results.push({ email: artist.email, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
