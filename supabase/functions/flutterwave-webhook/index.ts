// Flutterwave webhook handler. Verifies signature & processes payment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET");
  const signature = req.headers.get("verif-hash");
  if (!expected || signature !== expected) {
    console.warn("Invalid webhook signature");
    return new Response("invalid signature", { status: 401 });
  }

  try {
    const event = await req.json();
    const txRef = event?.data?.tx_ref;
    const txId = event?.data?.id ? String(event.data.id) : undefined;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Delegate verification by calling verify endpoint
    const verifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/flutterwave-verify`;
    const r = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
      body: JSON.stringify({ transaction_id: txId, tx_ref: txRef }),
    });
    const result = await r.json();
    console.log("webhook->verify result", result);
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
