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
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return json({ success: false, error: "Server configuration is incomplete" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ success: false, error: "Authentication required" }, 401);
    const { data: authData, error: authError } = await db.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return json({ success: false, error: "Invalid session" }, 401);
    const userId = authData.user.id;
    const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", userId);
    if (roleError) throw roleError;
    const roleNames = (roles ?? []).map((r: { role: string }) => r.role);
    const body = await req.json();
    const action = String(body.action ?? "");


    if (action === "update_bank_details") {
      if (!roleNames.some((r: string) => ["admin", "finance_manager"].includes(r))) return json({ success: false, error: "Finance admin privileges required" }, 403);
      const bankName = String(body.bank_name ?? "").trim().slice(0, 120);
      const accountName = String(body.account_name ?? "").trim().slice(0, 120);
      const accountNumber = String(body.account_number ?? "").replace(/\\s/g, "").slice(0, 30);
      const instructions = String(body.transfer_instructions ?? "").trim().slice(0, 1500);
      if (bankName && (!accountName || !/^[0-9]{6,20}$/.test(accountNumber))) {
        return json({ success: false, error: "Enter a bank name, account name, and account number containing 6–20 digits." }, 400);
      }
      if (!bankName && (accountName || accountNumber)) return json({ success: false, error: "Bank name is required when configuring account details." }, 400);
      const { data: settings, error: settingsError } = await db.from("distribution_payment_settings").upsert({
        id: true, bank_name: bankName, account_name: accountName, account_number: accountNumber,
        transfer_instructions: instructions, updated_by: userId, updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).select("bank_name,account_name,account_number,transfer_instructions,updated_at").single();
      if (settingsError) throw settingsError;
      return json({ success: true, settings });
    }

    if (action === "create_invoice") {
      if (!roleNames.some((r: string) => ["admin", "finance_manager", "distribution_manager"].includes(r))) {
        return json({ success: false, error: "Invoice management permission required" }, 403);
      }
      const amount = Number(body.total_amount);
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ success: false, error: "Invoice amount must be a positive whole number of NGN" }, 400);
      const accountId = String(body.billing_account_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(accountId)) return json({ success: false, error: "Choose a valid artist or label account" }, 400);
      const result = await db.rpc("create_distribution_invoice", {
        p_billing_account_id: accountId,
        p_release_id: body.release_id || null,
        p_description: String(body.description ?? "").trim(),
        p_total_amount: amount,
        p_due_at: body.due_at || null,
        p_internal_notes: String(body.internal_notes ?? "").slice(0, 4000),
        p_created_by: userId,
        p_issue_now: body.issue_now !== false,
        p_allow_release_before_full_payment: body.allow_release_before_full_payment === true,
      });
      if (result.error) throw result.error;
      const invoice = result.data;
      if (body.issue_now !== false) await deliverPendingNotifications(db, url, serviceKey, invoice.invoice_id);
      return json({ success: true, invoice });
    }

    if (action === "record_bank_transfer") {
      if (!roleNames.some((r: string) => ["admin", "finance_manager"].includes(r))) {
        return json({ success: false, error: "Finance admin privileges required" }, 403);
      }
      const invoiceId = String(body.invoice_id ?? "");
      const amount = Number(body.amount);
      if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ success: false, error: "Choose a valid invoice" }, 400);
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ success: false, error: "Payment amount must be a positive whole number of NGN" }, 400);
      const { data: invoice, error: invoiceError } = await db.from("distribution_invoices")
        .select("id,billing_account_id,total_amount,amount_paid,amount_due,status")
        .eq("id", invoiceId).maybeSingle();
      if (invoiceError) throw invoiceError;
      if (!invoice) return json({ success: false, error: "Invoice not found" }, 404);
      if (!["issued", "partially_paid", "overdue"].includes(invoice.status)) return json({ success: false, error: "This invoice cannot accept a payment in its current status" }, 409);
      if (amount > Number(invoice.amount_due)) return json({ success: false, error: "Payment exceeds the outstanding invoice balance" }, 400);

      const idempotencyKey = String(body.idempotency_key ?? crypto.randomUUID()).slice(0, 120);
      const { data: payment, error: insertError } = await db.from("distribution_payments").insert({
        invoice_id: invoice.id,
        billing_account_id: invoice.billing_account_id,
        amount,
        method: "bank_transfer",
        status: "pending_verification",
        transaction_reference: String(body.transaction_reference ?? "").trim().slice(0, 160) || null,
        note: String(body.note ?? "Bank transfer recorded by admin").trim().slice(0, 2000) || null,
        idempotency_key: idempotencyKey,
        recorded_by: userId,
      }).select("id,invoice_id,amount,method,status,transaction_reference,note,recorded_at").single();
      if (insertError?.code === "23505") return json({ success: false, error: "This payment request has already been recorded" }, 409);
      if (insertError) throw insertError;
      return json({ success: true, payment, message: "Transfer saved as pending verification. No balance or receipt has been changed yet." });
    }


    if (action === "submit_bank_transfer") {
      const invoiceId = String(body.invoice_id ?? "");
      const amount = Number(body.amount);
      if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ success: false, error: "Choose a valid invoice" }, 400);
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ success: false, error: "Payment amount must be a positive whole number of NGN" }, 400);
      const { data: invoice, error: invoiceError } = await db.from("distribution_invoices")
        .select("id,billing_account_id,amount_due,status").eq("id", invoiceId).maybeSingle();
      if (invoiceError) throw invoiceError;
      if (!invoice) return json({ success: false, error: "Invoice not found" }, 404);
      const owner = invoice.billing_account_id === userId;
      const { data: access, error: accessError } = owner ? { data: null, error: null } : await db.from("account_access")
        .select("role").eq("account_owner_id", invoice.billing_account_id).eq("user_id", userId).maybeSingle();
      if (accessError) throw accessError;
      if (!owner && !["account_admin", "manager"].includes(String(access?.role ?? ""))) {
        return json({ success: false, error: "You do not have permission to submit payment for this account" }, 403);
      }
      if (!["issued", "partially_paid", "overdue"].includes(invoice.status)) return json({ success: false, error: "This invoice is not currently payable" }, 409);
      if (amount > Number(invoice.amount_due)) return json({ success: false, error: "Payment exceeds the outstanding balance" }, 400);
      const idempotencyKey = String(body.idempotency_key ?? crypto.randomUUID()).slice(0, 120);
      const { data: payment, error: insertError } = await db.from("distribution_payments").insert({
        invoice_id: invoice.id, billing_account_id: invoice.billing_account_id, amount, method: "bank_transfer",
        status: "pending_verification", transaction_reference: String(body.transaction_reference ?? "").trim().slice(0, 160) || null,
        note: String(body.note ?? "Artist submitted bank transfer notice").trim().slice(0, 2000) || null,
        idempotency_key: "artist-transfer:" + idempotencyKey, recorded_by: userId,
      }).select("id,invoice_id,amount,method,status,transaction_reference,note,recorded_at").single();
      if (insertError?.code === "23505") return json({ success: false, error: "This transfer notice has already been submitted" }, 409);
      if (insertError) throw insertError;
      return json({ success: true, payment, message: "Transfer notice submitted. The invoice balance will update after finance verifies the funds." });
    }

    if (action === "confirm_payment") {
      if (!roleNames.some((r: string) => ["admin", "finance_manager"].includes(r))) {
        return json({ success: false, error: "Finance admin privileges required" }, 403);
      }
      const paymentId = String(body.payment_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return json({ success: false, error: "Choose a valid payment" }, 400);
      const { data: before, error: beforeError } = await db.from("distribution_payments")
        .select("id,invoice_id,method,status,transaction_reference").eq("id", paymentId).maybeSingle();
      if (beforeError) throw beforeError;
      if (!before) return json({ success: false, error: "Payment not found" }, 404);
      if (before.method === "card") return json({ success: false, error: "Card payments can only be confirmed after verified Flutterwave webhook processing" }, 409);
      if (before.method === "bank_transfer" && body.funds_verified !== true) {
        return json({ success: false, error: "Confirm that the funds have been verified in the bank account before posting this payment." }, 400);
      }
      const { data: confirmed, error: confirmError } = await db.rpc("confirm_distribution_payment", {
        p_payment_id: paymentId, p_admin_user_id: userId,
      });
      if (confirmError) {
        if (confirmError.code === "42501") return json({ success: false, error: "Finance admin privileges required" }, 403);
        throw confirmError;
      }
      await deliverPendingNotifications(db, url, serviceKey, confirmed.invoice_id ?? before.invoice_id);
      return json({ success: true, payment: confirmed });
    }

    if (action === "retry_receipt_email") {
      if (!roleNames.some((r: string) => ["admin", "finance_manager"].includes(r))) return json({ success: false, error: "Finance admin privileges required" }, 403);
      const invoiceId = String(body.invoice_id ?? "");
      const result = await deliverPendingNotifications(db, url, serviceKey, invoiceId || undefined);
      return json({ success: true, notifications: result });
    }

    return json({ success: false, error: "Unsupported action" }, 400);
  } catch (e) {
    console.error("[distribution-billing-admin]", e);
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return json({ success: false, error: message }, 500);
  }
});

async function deliverPendingNotifications(db: ReturnType<typeof createClient>, url: string, serviceKey: string, invoiceId?: string) {
  let query = db.from("billing_notification_outbox").select(
    "id,notification_type,invoice_id,payment_id,receipt_id,recipient_email,attempts"
  ).in("status", ["pending", "failed"]).order("created_at", { ascending: true }).limit(10);
  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  const { data: jobs, error } = await query;
  if (error) throw error;
  const outcomes = [];
  for (const job of jobs ?? []) {
    await db.from("billing_notification_outbox").update({
      status: "processing", attempts: Number(job.attempts ?? 0) + 1, updated_at: new Date().toISOString(), last_error: null,
    }).eq("id", job.id);
    try {
      let subject = "";
      let html = "";
      if (job.notification_type === "payment_receipt" && job.payment_id) {
        const { data: receipt, error: receiptError } = await db.from("distribution_receipts").select(
          "receipt_number,amount,total_invoice_amount,total_paid_after_payment,remaining_balance,currency,issued_at,invoice_id"
        ).eq("id", job.receipt_id).single();
        if (receiptError) throw receiptError;
        const { data: invoice, error: invError } = await db.from("distribution_invoices").select(
          "invoice_number,description,billing_account_id"
        ).eq("id", receipt.invoice_id).single();
        if (invError) throw invError;
        const { data: account, error: accountError } = await db.from("artists").select("name,account_name").eq("id", invoice.billing_account_id).single();
        if (accountError) throw accountError;
        const customer = account.account_name || account.name || "there";
        subject = "Payment Receipt — " + receipt.receipt_number;
        html = `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto"><h1>MALPINOHdistro</h1><h2>Payment receipt</h2><p>Hi ${esc(customer)},</p><p>We have confirmed your payment for ${esc(invoice.description)}.</p><div style="padding:18px;background:#f5f5f5;border-radius:8px"><p><b>Receipt number:</b> ${esc(receipt.receipt_number)}</p><p><b>Invoice:</b> ${esc(invoice.invoice_number)}</p><p><b>Payment received:</b> ₦${Number(receipt.amount).toLocaleString("en-NG")}</p><p><b>Total invoice:</b> ₦${Number(receipt.total_invoice_amount).toLocaleString("en-NG")}</p><p><b>Total paid to date:</b> ₦${Number(receipt.total_paid_after_payment).toLocaleString("en-NG")}</p><p><b>Outstanding balance:</b> ₦${Number(receipt.remaining_balance).toLocaleString("en-NG")}</p><p><b>Payment date:</b> ${new Date(receipt.issued_at).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})}</p></div><p>${Number(receipt.remaining_balance)>0 ? "Your remaining balance is outstanding on your MALPINOHdistro account. Please log in to your billing page to review the invoice and pay the balance." : "Your invoice has been paid in full. Thank you."}</p><p>Thank you for choosing MALPINOHdistro.</p></div>`;
      } else if (job.notification_type === "invoice_issued") {
        const { data: invoice, error: invError } = await db.from("distribution_invoices").select(
          "invoice_number,description,total_amount,amount_due,due_at,billing_account_id"
        ).eq("id", job.invoice_id).single();
        if (invError) throw invError;
        const { data: account, error: accountError } = await db.from("artists").select("name,account_name").eq("id", invoice.billing_account_id).single();
        if (accountError) throw accountError;
        subject = "New Distribution Invoice — " + invoice.invoice_number;
        html = `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto"><h1>MALPINOHdistro</h1><h2>Distribution invoice issued</h2><p>Hi ${esc(account.account_name || account.name || "there")},</p><p>A distribution invoice has been issued to your account.</p><div style="padding:18px;background:#f5f5f5;border-radius:8px"><p><b>Invoice:</b> ${esc(invoice.invoice_number)}</p><p><b>Description:</b> ${esc(invoice.description)}</p><p><b>Total due:</b> ₦${Number(invoice.total_amount).toLocaleString("en-NG")}</p>${invoice.due_at ? "<p><b>Due date:</b> "+esc(new Date(invoice.due_at).toLocaleDateString("en-GB",{timeZone:"Africa/Lagos"}))+"</p>" : ""}</div><p>Please log in to your MALPINOHdistro billing page to view the invoice and make payment.</p></div>`;
      }
      const resp = await fetch(`${url}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ to: job.recipient_email, subject, html }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(String(result.error ?? "Email delivery failed"));
      const { error: updateError } = await db.from("billing_notification_outbox").update({
        status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      if (updateError) throw updateError;
      outcomes.push({ id: job.id, status: "sent" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email delivery failed";
      await db.from("billing_notification_outbox").update({
        status: "failed", last_error: message.slice(0, 1000), updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      outcomes.push({ id: job.id, status: "failed", error: message });
    }
  }
  return outcomes;
}
