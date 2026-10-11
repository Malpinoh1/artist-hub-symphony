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

    // Reconcile only pending checkout attempts explicitly marked as renewals; never cancel unrelated pending purchases.
    const { data: pendingPayments, error: pendingError } = await supabase.from("payments").select("id,created_at")
      .eq("user_id", userId).eq("status", "pending")
      .contains("raw_response", { checkout_meta: { is_renewal: true } })
      .order("created_at", { ascending: false });
    if (pendingError) throw new Error("Could not check pending payments: " + pendingError.message);
    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + durationDays * 86400000).toISOString();
    const extra = Math.round((amountReceived - subscriptionFee) * 100) / 100;
    const paymentMeta = {
      manual_confirmation: true,
      confirmed_by_admin_user_id: authData.user.id,
      amount_received_ngn: amountReceived,
      subscription_fee_ngn: subscriptionFee,
      unapplied_difference_ngn: extra,
      duration_days: durationDays,
      receipt_reference: receiptReference,
      payment_channel: paymentMethod,
      processed_at: startDate,
    };

    // Prefer updating the newest pending attempt, so payment history is reconciled instead of duplicated.
    let paymentId: string;
    const pendingToUse = pendingPayments?.[0];
    if (pendingToUse) {
      const { data: paid, error: payError } = await supabase.from("payments").update({
        plan_id: plan.id,
        flutterwave_tx_ref: receiptReference,
        amount_usd: 0,
        amount_charged: amountReceived,
        currency: "NGN",
        payment_method: paymentMethod + " (manual confirmation)",
        status: "successful",
        customer_email: email,
        raw_response: paymentMeta,
        updated_at: startDate,
      }).eq("id", pendingToUse.id).eq("status", "pending").select("id").maybeSingle();
      if (payError || !paid) throw new Error("Could not confirm the pending payment: " + (payError?.message ?? "payment status changed; refresh and retry"));
      paymentId = paid.id;
    } else {
      const { data: inserted, error: insertError } = await supabase.from("payments").insert({
        user_id: userId,
        plan_id: plan.id,
        flutterwave_tx_ref: receiptReference,
        amount_usd: 0,
        amount_charged: amountReceived,
        currency: "NGN",
        payment_method: paymentMethod + " (manual confirmation)",
        status: "successful",
        customer_email: email,
        raw_response: paymentMeta,
      }).select("id").single();
      if (insertError || !inserted) throw new Error("Could not create payment history: " + (insertError?.message ?? "unknown database error"));
      paymentId = inserted.id;
    }

    // Mark other pending attempts for this artist as failed so the same renewal is not counted twice.
    const duplicateIds = (pendingPayments ?? []).filter((p: { id: string }) => p.id !== paymentId).map((p: { id: string }) => p.id);
    if (duplicateIds.length) {
      const { error } = await supabase.from("payments").update({
        status: "failed",
        raw_response: { reconciled_duplicate: true, reconciled_into: receiptReference, reconciled_at: startDate },
        updated_at: startDate,
      }).in("id", duplicateIds).eq("user_id", userId).eq("status", "pending");
      if (error) throw new Error("Payment recorded, but duplicate pending attempts could not be reconciled: " + error.message);
    }

    const { data: currentSub, error: subLookupError } = await supabase.from("subscriptions").select("id,end_date").eq("user_id", userId).order("end_date", { ascending: false }).limit(1).maybeSingle();
    if (subLookupError) throw new Error("Payment recorded, but subscription lookup failed: " + subLookupError.message);
    const subPayload = { plan_id: plan.id, status: "active", start_date: startDate, end_date: endDate, last_payment_id: paymentId, updated_at: startDate, auto_renew: false };
    let subscriptionError;
    if (currentSub?.id) {
      ({ error: subscriptionError } = await supabase.from("subscriptions").update(subPayload).eq("id", currentSub.id));
    } else {
      ({ error: subscriptionError } = await supabase.from("subscriptions").insert({ user_id: userId, ...subPayload }));
    }
    if (subscriptionError) throw new Error("Payment recorded, but subscription update failed: " + subscriptionError.message);

    const { error: legacyError } = await supabase.from("subscribers").upsert({
      user_id: userId, email, subscribed: true, subscription_tier: plan.name, subscription_end: endDate, updated_at: startDate,
    }, { onConflict: "email" });
    if (legacyError) console.error("Legacy subscriber sync warning:", legacyError.message);

    const notificationMessage = `Your ${durationDays}-day MALPINOHdistro subscription renewal is active. Amount received: ₦${amountReceived.toLocaleString("en-NG")}; subscription fee: ₦${subscriptionFee.toLocaleString("en-NG")}; difference not applied: ₦${extra.toLocaleString("en-NG")}.`;
    const { data: notification, error: notificationError } = await supabase.from("notifications").insert({
      user_id: userId, type: "payment", title: "Payment received — subscription activated",
      message: notificationMessage, link: "/billing",
      metadata: { receipt_reference: receiptReference, payment_id: paymentId, duration_days: durationDays, amount_received_ngn: amountReceived, subscription_fee_ngn: subscriptionFee, unapplied_difference_ngn: extra },
      read: false,
    }).select("id").single();
    if (notificationError) throw new Error("Subscription updated, but in-app notification creation failed: " + notificationError.message);

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
      payment_id: paymentId, payment_status: "successful", subscription_id: currentSub?.id ?? null,
      subscription_status: "active", subscription_start: startDate, subscription_end: endDate,
      plan_name: plan.name, duration_days: durationDays, notification_created: !!notification?.id,
      email_status: emailStatus, amount_received_ngn: amountReceived,
      subscription_fee_ngn: subscriptionFee, unapplied_difference_ngn: extra,
      duplicate_pending_attempts_reconciled: duplicateIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-process-manual-payment]", message);
    return json({ success: false, error: message }, 500);
  }
});
