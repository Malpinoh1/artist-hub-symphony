// Scheduled: expire past subscriptions, send expiry reminders (7/3/1 days),
// and charge auto-renew via Flutterwave tokenized card.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
  const now = new Date();

  // 1) Expire any active sub past end_date with no auto_renew or failed renewal
  const { data: expired } = await admin.from("subscriptions")
    .select("id,user_id").eq("status", "active").lt("end_date", now.toISOString());
  for (const s of expired ?? []) {
    await admin.from("subscriptions").update({ status: "expired" }).eq("id", s.id);
    await admin.from("subscribers").update({ subscribed: false, updated_at: now.toISOString() }).eq("user_id", s.user_id);
  }

  // 2) Reminders 7/3/1 days
  for (const days of [7, 3, 1]) {
    const target = new Date(now.getTime() + days * 86400000);
    const start = new Date(target); start.setUTCHours(0,0,0,0);
    const end = new Date(target); end.setUTCHours(23,59,59,999);
    const { data: subs } = await admin.from("subscriptions")
      .select("id,user_id,end_date,plans(name)")
      .eq("status", "active")
      .gte("end_date", start.toISOString()).lte("end_date", end.toISOString());
    for (const s of subs ?? []) {
      const { data: artist } = await admin.from("artists").select("email,name").eq("id", s.user_id).maybeSingle();
      if (!artist?.email) continue;
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          to: artist.email,
          subject: `Your subscription expires in ${days} day${days === 1 ? "" : "s"}`,
          html: `<p>Hi ${artist.name || ""},</p><p>Your <strong>${(s as any).plans?.name || "MALPINOHdistro"}</strong> subscription expires on <strong>${new Date(s.end_date).toDateString()}</strong>. Renew now to avoid losing access.</p><p><a href="https://malpinohdistro.com.ng/pricing">Renew</a></p>`,
        }),
      });
    }
  }

  // 3) Auto-renew tomorrow
  const tomorrow = new Date(now.getTime() + 86400000);
  const start = new Date(tomorrow); start.setUTCHours(0,0,0,0);
  const end = new Date(tomorrow); end.setUTCHours(23,59,59,999);
  const { data: renewals } = await admin.from("subscriptions")
    .select("id,user_id,end_date,plan_id,flutterwave_card_token,plans(*)")
    .eq("status", "active").eq("auto_renew", true)
    .not("flutterwave_card_token", "is", null)
    .gte("end_date", start.toISOString()).lte("end_date", end.toISOString());

  for (const s of renewals ?? []) {
    try {
      const plan: any = (s as any).plans;
      const { data: fx } = await admin.from("exchange_rates").select("rate")
        .eq("base_currency","USD").eq("target_currency","NGN")
        .order("updated_at",{ascending:false}).limit(1).maybeSingle();
      const fxRate = Number(fx?.rate ?? 1250);
      const amount = Math.round(plan.price_usd * fxRate * 100) / 100;
      const txRef = `MDH-AR-${s.user_id.slice(0,8)}-${Date.now()}`;
      const { data: artist } = await admin.from("artists").select("email,name").eq("id", s.user_id).maybeSingle();
      const email = artist?.email || "user@malpinohdistro.com.ng";

      await admin.from("payments").insert({
        user_id: s.user_id, plan_id: plan.id, flutterwave_tx_ref: txRef,
        amount_usd: plan.price_usd, amount_charged: amount, currency: "NGN",
        fx_rate: fxRate, status: "pending", customer_email: email,
      });

      const resp = await fetch("https://api.flutterwave.com/v3/tokenized-charges", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          token: s.flutterwave_card_token, currency: "NGN", amount,
          email, tx_ref: txRef, narration: `MDH ${plan.name} renewal`,
        }),
      });
      const data = await resp.json();
      if (data.status === "success" && data.data?.status === "successful") {
        const newEnd = new Date(s.end_date);
        newEnd.setUTCDate(newEnd.getUTCDate() + plan.duration_days);
        await admin.from("subscriptions").update({ end_date: newEnd.toISOString() }).eq("id", s.id);
        await admin.from("payments").update({
          status: "successful", flutterwave_transaction_id: String(data.data.id),
          payment_method: "card", raw_response: data.data,
        }).eq("flutterwave_tx_ref", txRef);
        await admin.from("subscribers").update({ subscription_end: newEnd.toISOString(), updated_at: new Date().toISOString() }).eq("user_id", s.user_id);
      } else {
        await admin.from("payments").update({ status: "failed", raw_response: data }).eq("flutterwave_tx_ref", txRef);
      }
    } catch (e) { console.error("renewal", e); }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
