import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { attributeReferral } from "../_shared/collective-referral.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const code = typeof body?.referral_code === "string"
      ? body.referral_code.trim().toLowerCase().slice(0, 80)
      : "";
    if (!code) return json({ error: "referral_code is required" }, 400);

    const result = await attributeReferral(admin, {
      referralCode: code,
      referredUserId: user.id,
      referredEmail: user.email.toLowerCase(),
      source: "signup_link",
    });

    return json({ success: true, ...result });
  } catch (e) {
    console.error("collective-referral-claim error", e);
    return json({ error: (e as Error)?.message ?? "Unexpected error" }, 500);
  }
});
