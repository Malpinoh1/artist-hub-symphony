// Initiates a Flutterwave Standard checkout for a subscription plan.
// Returns hosted payment link. Prices stored in USD, charged in NGN at live FX.
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
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user?.id) {
      console.error("auth failed", authErr);
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;
    const email = userData.user.email || "user@malpinohdistro.com.ng";

    const { plan_code, auto_renew = true, currency: requestedCurrency } = await req.json();
    if (!plan_code) return json({ error: "plan_code required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: plan, error: planErr } = await admin
      .from("plans").select("*").eq("code", plan_code).eq("is_active", true).maybeSingle();
    if (planErr || !plan) return json({ error: "Plan not found" }, 404);

    // FX: USD -> NGN
    const currency = requestedCurrency === "USD" ? "USD" : "NGN";
    let fxRate = 1;
    let amountCharged = plan.price_usd;
    if (currency === "NGN") {
      const { data: fx } = await admin
        .from("exchange_rates").select("rate")
        .eq("base", "USD").eq("quote", "NGN")
        .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      fxRate = Number(fx?.rate ?? 1250);
      amountCharged = Math.round(plan.price_usd * fxRate * 100) / 100;
    }

    const txRef = `MDH-${userId.slice(0, 8)}-${Date.now()}`;

    // Persist payment as pending
    const { error: payErr } = await admin.from("payments").insert({
      user_id: userId,
      plan_id: plan.id,
      flutterwave_tx_ref: txRef,
      amount_usd: plan.price_usd,
      amount_charged: amountCharged,
      currency,
      fx_rate: fxRate,
      status: "pending",
      customer_email: email,
    });
    if (payErr) {
      console.error("payment insert", payErr);
      return json({ error: "Could not initialize payment" }, 500);
    }

    const origin = req.headers.get("origin") || "https://malpinohdistro.com.ng";
    const redirectUrl = `${origin}/payment/callback`;

    const flwBody = {
      tx_ref: txRef,
      amount: amountCharged,
      currency,
      redirect_url: redirectUrl,
      payment_options: "card,banktransfer,ussd,mobilemoney,account",
      customer: { email, name: email.split("@")[0] },
      meta: { user_id: userId, plan_id: plan.id, plan_code: plan.code, auto_renew },
      customizations: {
        title: "MALPINOHdistro",
        description: `${plan.name} subscription`,
        logo: "https://malpinohdistro.com.ng/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png",
      },
    };

    const flwResp = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flwBody),
    });
    const flwJson = await flwResp.json();
    if (flwJson.status !== "success") {
      console.error("flw init failed", flwJson);
      await admin.from("payments").update({ status: "failed", raw_response: flwJson }).eq("flutterwave_tx_ref", txRef);
      return json({ error: flwJson.message || "Flutterwave init failed" }, 502);
    }

    return json({ link: flwJson.data.link, tx_ref: txRef });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
