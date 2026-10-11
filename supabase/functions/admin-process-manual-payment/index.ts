import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ success: false, error: "Authentication required" }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(auth.slice(7));
    if (authError || !authData.user) return json({ success: false, error: "Invalid session" }, 401);

    const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id);
    if (roleError || !roleRows?.some((r: { role: string }) => r.role === "admin")) {
      return json({ success: false, error: "Admin privileges required" }, 403);
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const amountReceived = Number(body.amount_received_ngn);
    const subscriptionFee = Number(body.subscription_fee_ngn);
    const durationDays = Number(body.duration_days);
    const paymentMethod = String(body.payment_method ?? "Manual transfer").trim().slice(0, 100);
    const receiptReference = String(body.receipt_reference ?? "").trim().slice(0, 100);
    const sendEmail = body.send_email === true;
    const emailSubject = String(body.email_subject ?? "Payment receipt — MALPINOHdistro").trim().slice(0, 180);
    const emailMessage = String(body.email_message ?? "").trim().slice(0, 12000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ success: false, error: "Enter a valid artist email" }, 400);
    if (!Number.isFinite(amountReceived) || !Number.isFinite(subscriptionFee) || amountReceived <= 0 || subscriptionFee <= 0 || amountReceived < subscriptionFee) {
      return json({ success: false, error: "Amounts must be positive and the received amount must cover the subscription fee" }, 400);
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 730) return json({ success: false, error: "Duration must be between 1 and 730 days" }, 400);
    if (!receiptReference || !/^[A-Za-z0-9][A-Za-z0-9._-]{5,99}$/.test(receiptReference)) return json({ success: false, error: "Use a unique receipt reference of 6–100 letters, numbers, dots, underscores or hyphens" }, 400);
    if (sendEmail && (!emailSubject || !emailMessage)) return json({ success: false, error: "Email subject and message are required" }, 400);

    const { data: targetAuth, error: targetError } = await supabase.auth.admin.getUserByEmail(email);
    if (targetError || !targetAuth.user) return json({ success: false, error: "No registered user found for that email" }, 404);
    const userId = targetAuth.user.id;

    const { data: artist, error: artistError } = await supabase.from("artists").select("id,name,email").eq("id", userId).maybeSingle();
    if (artistError || !artist) return json({ success: false, error: "No artist account is linked to this user" }, 404);

    const { data: existingRef } = await supabase.from("payments").select("id,status").eq("flutterwave_tx_ref", receiptReference).maybeSingle();
    if (existingRef) return json({ success: false, error: "That receipt reference already exists. Use a unique reference to avoid duplicate receipts." }, 409);

    let { data: plan, error: planError } = await supabase.from("plans").select("id,name,price_usd,duration_days").eq("duration_days", durationDays).eq("is_active", true).order("sort_order", { ascending: true }).limit(1).maybeSingle();
    if (planError) throw new Error("Could not look up an active plan: " + planError.message);

    // Manual-only durations are represented by inactive internal plans, never public checkout plans.
    if (!plan) {
      const internalCode = `manual_${durationDays}_day`;
      const { data: existingInternal, error: internalError } = await supabase.from("plans")
        .select("id,name,price_usd,duration_days").eq("code", internalCode).maybeSingle();
      if (internalError) throw new Error("Could not look up the internal manual plan: " + internalError.message);
      if (existingInternal) {
        plan = existingInternal;
      } else {
        const { data: annual, error: annualError } = await supabase.from("plans")
          .select("release_limit,features").eq("code", "annual").eq("is_active", true).maybeSingle();
        if (annualError || !annual) throw new Error("Could not find the active annual plan to inherit subscription features: " + (annualError?.message ?? "annual plan missing"));
        const { data: insertedPlan, error: insertPlanError } = await supabase.from("plans").insert({
          code: internalCode,
          name: `Manual ${durationDays}-Day Renewal`,
          description: "Internal admin-only term for manually verified payments; not available for public purchase.",
          price_usd: 0,
          duration_days: durationDays,
          release_limit: annual.release_limit,
          features: annual.features,
          supports_auto_renew: false,
          is_active: false,
          sort_order: 999,
        }).select("id,name,price_usd,duration_days").single();
        if (insertPlanError || !insertedPlan) throw new Error("Could not create internal manual plan: " + (insertPlanError?.message ?? "unknown database error"));
        plan = insertedPlan;
      }
    }

    const { data: processed, error: processError } = await supabase.rpc("process_manual_payment_renewal", {
      p_user_id: userId,
      p_plan_id: plan.id,
      p_receipt_reference: receiptReference,
      p_amount_received_ngn: amountReceived,
      p_subscription_fee_ngn: subscriptionFee,
      p_payment_method: paymentMethod,
      p_admin_user_id: authData.user.id,
      p_duration_days: durationDays,
      p_email: email,
    });
    if (processError || !processed) {
      if (processError?.code === "23505") return json({ success: false, error: "That receipt reference already exists. Use a unique reference to avoid duplicate receipts." }, 409);
      throw new Error("Could not atomically process manual payment and subscription: " + (processError?.message ?? "unknown database error"));
    }

    const startDate = String(processed.subscription_start);
    const endDate = String(processed.subscription_end);
    const extra = Number(processed.unapplied_difference_ngn);
    const paymentId = String(processed.payment_id);

    let emailStatus = "not_requested";
    if (sendEmail) {
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto"><h1>MALPINOHdistro</h1><h2>Payment receipt</h2><p>Hi ${escapeHtml(artist.name || email)},</p><p>${escapeHtml(emailMessage).replace(/\n/g, "<br>")}</p><hr><p><b>Receipt reference:</b> ${escapeHtml(receiptReference)}<br><b>Amount received:</b> ₦${amountReceived.toLocaleString("en-NG")}<br><b>Subscription fee:</b> ₦${subscriptionFee.toLocaleString("en-NG")}<br><b>Duration:</b> ${durationDays} days<br><b>Subscription ends:</b> ${new Date(endDate).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })}<br><b>Difference not applied:</b> ₦${extra.toLocaleString("en-NG")}</p><p>Thank you for choosing MALPINOHdistro.</p></div>`;
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ to: email, subject: emailSubject, html }),
      });
      const emailResult = await emailResponse.json().catch(() => ({}));
      emailStatus = emailResponse.ok ? "accepted" : "failed";
      if (!emailResponse.ok) console.error("Receipt email failed after renewal update:", emailResult);
    }

    return json({
      success: true, artist_name: artist.name, email, receipt_reference: receiptReference,
      payment_id: paymentId, payment_status: "successful", subscription_id: processed.subscription_id ?? null,
      subscription_status: "active", subscription_start: startDate, subscription_end: endDate,
      plan_name: plan.name, duration_days: durationDays, notification_created: !!processed.notification_id,
      email_status: emailStatus, amount_received_ngn: amountReceived,
      subscription_fee_ngn: subscriptionFee, unapplied_difference_ngn: extra,
      duplicate_pending_attempts_reconciled: Number(processed.duplicate_pending_attempts_reconciled ?? 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-process-manual-payment]", message);
    return json({ success: false, error: message }, 500);
  }
});
