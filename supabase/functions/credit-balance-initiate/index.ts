// Initiates a secure Flutterwave checkout for an artist's outstanding credit balance.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user?.id) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = auth.user.id;
    const { data: artist, error: artistError } = await admin
      .from("artists").select("id,email,name,credit_balance").eq("id", userId).maybeSingle();
    if (artistError || !artist) return json({ error: "Artist account not found" }, 404);

    const amountUsd = Math.round(Number(artist.credit_balance || 0) * 100) / 100;
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return json({ error: "There is no outstanding credit balance to pay." }, 409);

    const { data: fx } = await admin.from("exchange_rates").select("rate")
      .eq("base", "USD").eq("quote", "NGN")
      .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    const fxRate = Number(fx?.rate ?? 1250);
    if (!Number.isFinite(fxRate) || fxRate <= 0) return json({ error: "Could not determine the current exchange rate." }, 500);
    const amountCharged = Math.round(amountUsd * fxRate * 100) / 100;
    const txRef = `MDH-CREDIT-${userId.slice(0, 8)}-${Date.now()}`;

    const { error: payError } = await admin.from("payments").insert({
      user_id: userId,
      plan_id: null,
      flutterwave_tx_ref: txRef,
      amount_usd: amountUsd,
      amount_charged: amountCharged,
      currency: "NGN",
      fx_rate: fxRate,
      status: "pending",
      customer_email: auth.user.email || artist.email,
      raw_response: { checkout_meta: { is_credit_payment: true, credit_amount_usd: amountUsd } },
    });
    if (payError) {
      console.error("Could not create credit payment", payError);
      return json({ error: "Could not initialize payment." }, 500);
    }

    const origin = req.headers.get("origin") || "https://malpinohdistro.com.ng";
    const flwResp = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountCharged,
        currency: "NGN",
        redirect_url: `${origin}/payment/callback`,
        payment_options: "card,banktransfer,ussd,mobilemoney,account",
        customer: { email: auth.user.email || artist.email, name: artist.name || (auth.user.email || "").split("@")[0] },
        meta: { user_id: userId, is_credit_payment: true, credit_amount_usd: amountUsd },
        customizations: {
          title: "MALPINOHdistro",
          description: "Pay outstanding account credit balance",
          logo: "https://malpinohdistro.com.ng/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png",
        },
      }),
    });
    const flwJson = await flwResp.json();
    if (flwJson.status !== "success" || !flwJson.data?.link) {
      await admin.from("payments").update({ status: "failed", raw_response: flwJson }).eq("flutterwave_tx_ref", txRef);
      return json({ error: flwJson.message || "Could not start checkout." }, 502);
    }
    return json({ link: flwJson.data.link, tx_ref: txRef, amount_usd: amountUsd, amount_charged: amountCharged });
  } catch (error) {
    console.error(error);
    return json({ error: "Could not initialize credit payment." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
