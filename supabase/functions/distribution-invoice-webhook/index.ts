import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, verif-hash","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try{
  const expected=Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET_HASH")||Deno.env.get("FLUTTERWAVE_SECRET_HASH");
  const supplied=req.headers.get("verif-hash");
  if(!expected||!supplied||supplied!==expected) return json({error:"Invalid webhook signature"},401);
  const payload=await req.json();
  const data=payload?.data||payload;
  const txRef=String(data?.tx_ref||"");
  const transactionId=String(data?.id||data?.transaction_id||"");
  if(!txRef.startsWith("MDH-DIST-")||!transactionId) return json({received:true,ignored:true});
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,secret=Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if(!secret) return json({error:"Provider verification is not configured"},503);
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {data:payment,error:pe}=await db.from("distribution_payments").select("id,amount,currency,status,provider_reference,method").eq("provider_reference",txRef).eq("method","card").maybeSingle();
  if(pe) throw pe;
  if(!payment) return json({received:true,ignored:true});
  if(payment.status==="confirmed") return json({received:true,already_confirmed:true});
  const verifyResp=await fetch("https://api.flutterwave.com/v3/transactions/"+encodeURIComponent(transactionId)+"/verify",{headers:{Authorization:"Bearer "+secret}});
  const verified=await verifyResp.json().catch(()=>({}));
  const d=verified?.data;
  if(!verifyResp.ok||verified?.status!=="success"||d?.status!=="successful"||String(d?.tx_ref)!==txRef||
     String(d?.currency)!=="NGN"||Math.round(Number(d?.amount))!==Number(payment.amount)){
    console.error("Invoice payment verification mismatch",{txRef,transactionId,status:d?.status,currency:d?.currency,amount:d?.amount});
    return json({error:"Provider verification did not match the pending invoice payment"},409);
  }
  const {data:confirmed,error:ce}=await db.rpc("confirm_distribution_card_payment",{p_payment_id:payment.id,p_provider_reference:txRef});
  if(ce) throw ce;
  const {data:jobs}=await db.from("billing_notification_outbox").select("id,recipient_email,receipt_id").eq("payment_id",payment.id).eq("status","pending").limit(1);
  let emailStatus="not_queued";
  for(const job of jobs||[]){
    try{
      const {data:receipt,error:re}=await db.from("distribution_receipts").select("*").eq("id",job.receipt_id).single();
      if(re) throw re;
      const {data:invoice,error:ie}=await db.from("distribution_invoices").select("invoice_number,description,billing_account_id").eq("id",receipt.invoice_id).single();
      if(ie) throw ie;
      const {data:artist,error:ae}=await db.from("artists").select("name,account_name").eq("id",invoice.billing_account_id).single();
      if(ae) throw ae;
      const esc=(s:string)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const subject="Payment Receipt — "+receipt.receipt_number;
      const html=`<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto"><h1>MALPINOHdistro</h1><h2>Payment receipt</h2><p>Hi ${esc(artist.account_name||artist.name||"there")},</p><p>Your card payment for ${esc(invoice.description)} has been confirmed.</p><div style="padding:18px;background:#f5f5f5;border-radius:8px"><p><b>Receipt:</b> ${esc(receipt.receipt_number)}</p><p><b>Invoice:</b> ${esc(invoice.invoice_number)}</p><p><b>Payment received:</b> ₦${Number(receipt.amount).toLocaleString("en-NG")}</p><p><b>Invoice total:</b> ₦${Number(receipt.total_invoice_amount).toLocaleString("en-NG")}</p><p><b>Paid to date:</b> ₦${Number(receipt.total_paid_after_payment).toLocaleString("en-NG")}</p><p><b>Outstanding balance:</b> ₦${Number(receipt.remaining_balance).toLocaleString("en-NG")}</p></div><p>${Number(receipt.remaining_balance)>0?"Your remaining balance is still owed to MALPINOHdistro. Please visit your billing page to pay it.":"Your invoice is paid in full. Thank you."}</p></div>`;
      const mail=await fetch(`${url}/functions/v1/send-email`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${service}`},body:JSON.stringify({to:job.recipient_email,subject,html})});
      const mailResult=await mail.json().catch(()=>({}));
      if(!mail.ok) throw new Error(String(mailResult.error||"Receipt email failed"));
      const {error:ue}=await db.from("billing_notification_outbox").update({status:"sent",sent_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null}).eq("id",job.id);
      if(ue) throw ue;
      emailStatus="sent";
    }catch(err){
      const message=err instanceof Error?err.message:"Receipt email failed";
      await db.from("billing_notification_outbox").update({status:"failed",last_error:message.slice(0,1000),updated_at:new Date().toISOString(),attempts:1}).eq("id",job.id);
      emailStatus="failed";
      console.error("Invoice receipt email delivery failed",message);
    }
  }
  return json({received:true,confirmed:true,payment:confirmed,notification_queued:!!jobs?.length,email_status:emailStatus});
 }catch(e){console.error("[distribution-invoice-webhook]",e);return json({error:e instanceof Error?e.message:"Unexpected error"},500);}
});