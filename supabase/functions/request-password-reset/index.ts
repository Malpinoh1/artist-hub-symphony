import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://malpinohdistro.com.ng",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin === "https://malpinohdistro.com.ng" ? origin : "https://malpinohdistro.com.ng",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!supabaseUrl || !serviceRoleKey || !brevoApiKey) {
      console.error("Password reset is missing required server configuration.");
      return new Response(JSON.stringify({ error: "Password reset is temporarily unavailable." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    // Generate a signed, single-use Supabase recovery link; send it only through Brevo.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://malpinohdistro.com.ng/reset-password" },
    });

    // Avoid exposing whether the account exists.
    if (error || !data?.properties?.action_link) {
      console.info("Password recovery requested; no email sent for this address.");
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const mailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "MALPINOHdistro", email: "no-reply@malpinohdistro.com.ng" },
        to: [{ email }],
        templateId: 29,
        params: { resetLink: data.properties.action_link },
      }),
    });

    if (!mailResponse.ok) {
      console.error("Brevo password reset email failed:", mailResponse.status, await mailResponse.text());
      return new Response(JSON.stringify({ error: "We couldn't send the reset email. Please try again shortly." }), { status: 502, headers: { ...headers, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return new Response(JSON.stringify({ error: "Password reset is temporarily unavailable." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
