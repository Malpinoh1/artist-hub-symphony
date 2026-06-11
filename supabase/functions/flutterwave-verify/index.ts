// Verifies a Flutterwave transaction (called after redirect or as fallback to webhook).
// Idempotent: safe to call multiple times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { transaction_id, tx_ref } = await req.json();
    if (!transaction_id && !tx_ref) return json({ error: "transaction_id or tx_ref required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await processVerification(admin, transaction_id, tx_ref);
    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

async function processVerification(admin: any, transactionId?: string, txRef?: string) {
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
  let url = "";
  if (transactionId) url = `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`;
  else url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef!)}`;

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  const data = await resp.json();
  if (data.status !== "success" || !data.data) {
    return { ok: false, error: "Verification failed", raw: data };
  }
  const tx = data.data;
  const reference = tx.tx_ref;

  const { data: payment } = await admin
    .from("payments").select("*, plans(*)").eq("flutterwave_tx_ref", reference).maybeSingle();
  if (!payment) return { ok: false, error: "Payment record not found" };

  // Idempotency: if already successful, no double-grant.
  if (payment.status === "successful") return { ok: true, already: true, payment_id: payment.id };

  const isSuccess =
    tx.status === "successful" &&
    Number(tx.amount) >= Number(payment.amount_charged) - 0.5 &&
    tx.currency === payment.currency;

  if (!isSuccess) {
    await admin.from("payments").update({
      status: tx.status || "failed",
      flutterwave_transaction_id: String(tx.id),
      payment_method: tx.payment_type,
      raw_response: tx,
    }).eq("id", payment.id);
    await notifyUser(admin, payment.user_id, "failed", payment);
    return { ok: false, error: "Payment unsuccessful or amount mismatch" };
  }

  await admin.from("payments").update({
    status: "successful",
    flutterwave_transaction_id: String(tx.id),
    payment_method: tx.payment_type,
    raw_response: tx,
  }).eq("id", payment.id);

  const plan = payment.plans;

  // PAY-PER-RELEASE: grant a single-use release credit, no subscription change
  if (plan.code === "per_release") {
    await admin.from("release_credits").insert({
      user_id: payment.user_id,
      payment_id: payment.id,
      status: "available",
    });
    await notifyUser(admin, payment.user_id, "successful", { ...payment, plans: plan });
    return { ok: true, payment_id: payment.id, kind: "credit" };
  }

  // SUBSCRIPTION FLOW
  const now = new Date();
  const { data: existing } = await admin
    .from("subscriptions").select("*").eq("user_id", payment.user_id)
    .order("end_date", { ascending: false }).limit(1).maybeSingle();

  let startDate = now.toISOString();
  let baseEnd = now;
  if (existing && new Date(existing.end_date) > now && existing.plan_id === plan.id) {
    baseEnd = new Date(existing.end_date);
  }
  const endDate = new Date(baseEnd);
  endDate.setUTCDate(endDate.getUTCDate() + plan.duration_days);

  const autoRenew = tx.meta?.auto_renew !== false;
  const cardToken = tx.card?.token ?? null;

  const subPayload = {
    user_id: payment.user_id,
    plan_id: plan.id,
    status: "active",
    start_date: existing && new Date(existing.end_date) > now ? existing.start_date : startDate,
    end_date: endDate.toISOString(),
    auto_renew: autoRenew,
    last_payment_id: payment.id,
    flutterwave_card_token: cardToken ?? existing?.flutterwave_card_token ?? null,
    cancelled_at: null,
  };

  if (existing) {
    await admin.from("subscriptions").update(subPayload).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(subPayload);
  }

  // Mirror into legacy subscribers table for backward compat
  await admin.from("subscribers").upsert([{
    user_id: payment.user_id,
    email: payment.customer_email,
    subscribed: true,
    subscription_tier: plan.code,
    subscription_end: endDate.toISOString(),
    updated_at: new Date().toISOString(),
  }], { onConflict: "user_id" });

  await notifyUser(admin, payment.user_id, "successful", { ...payment, plans: plan });

  return { ok: true, payment_id: payment.id, subscription_end: endDate.toISOString() };
}

async function notifyUser(admin: any, userId: string, kind: "successful" | "failed", payment: any) {
  try {
    const { data: artist } = await admin.from("artists").select("email,name").eq("id", userId).maybeSingle();
    const to = artist?.email || payment.customer_email;
    if (!to) return;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const planName = payment.plans?.name || "subscription";
    const subject = kind === "successful" ? "Payment successful — subscription activated" : "Payment failed";
    const html = kind === "successful"
      ? `<p>Hi ${artist?.name || ""},</p><p>Your payment of <strong>$${payment.amount_usd}</strong> for the <strong>${planName}</strong> plan was successful. Your subscription is now active.</p><p>— MALPINOHdistro</p>`
      : `<p>Hi ${artist?.name || ""},</p><p>Your payment of <strong>$${payment.amount_usd}</strong> for the <strong>${planName}</strong> plan could not be completed. Please try again.</p><p>— MALPINOHdistro</p>`;
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (e) { console.error("notify failed", e); }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
