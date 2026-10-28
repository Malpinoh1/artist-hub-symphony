import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try {
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return json({error:"Authentication required"},401);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:ud,error:ue}=await userClient.auth.getUser();
  if(ue||!ud.user) return json({error:"Invalid session"},401);
  const user=ud.user;
  const body=await req.json();
  const invoiceId=String(body.invoice_id??"");
  const amount=Number(body.amount);
  if(!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({error:"Invalid invoice"},400);
  if(!Number.isSafeInteger(amount)||amount<=0) return json({error:"Enter a positive whole-NGN payment amount"},400);
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {data:invoice,error:ie}=await db.from("distribution_invoices").select("id,invoice_number,billing_account_id,total_amount,amount_due,status,description").eq("id",invoiceId).maybeSingle();
  if(ie) throw ie;
  if(!invoice) return json({error:"Invoice not found"},404);
  const owner=invoice.billing_account_id===user.id;
  const {data:access}=owner?{data:null}:await db.from("account_access").select("role").eq("account_owner_id",invoice.billing_account_id).eq("user_id",user.id).maybeSingle();
  if(!owner && !["account_admin","manager"].includes(String(access?.role??""))) return json({error:"You do not have permission to pay this account's invoice"},403);
  if(!["issued","partially_paid","overdue"].includes(invoice.status)) return json({error:"This invoice is not currently payable"},409);
  if(amount>Number(invoice.amount_due)) return json({error:"Payment amount exceeds the outstanding balance"},400);
  const secret=Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if(!secret) return json({error:"Card payment is not configured. Please contact MALPINOHdistro support."},503);
  const txRef="MDH-DIST-"+invoice.id.slice(0,8)+"-"+crypto.randomUUID();
  const {data:artist,error:ae}=await db.from("artists").select("name,email").eq("id",invoice.billing_account_id).single();
  if(ae) throw ae;
  const customerEmail=user.email || artist.email;
  if(!customerEmail) return json({error:"No billing email is available for this account"},400);
  const {data:payment,error:pe}=await db.from("distribution_payments").insert({
    invoice_id:invoice.id,billing_account_id:invoice.billing_account_id,amount,currency:"NGN",method:"card",
    status:"pending_verification",provider_reference:txRef,idempotency_key:"flutterwave:"+txRef,
    recorded_by:user.id,note:"Flutterwave hosted checkout"
  }).select("id").single();
  if(pe) throw pe;
  const origin=req.headers.get("origin")||"https://malpinohdistro.com.ng";
  const redirectUrl=new URL("/billing",origin);
  redirectUrl.searchParams.set("invoice_id",invoice.id);
  redirectUrl.searchParams.set("payment","pending");
  const response=await fetch("https://api.flutterwave.com/v3/payments",{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify({
    tx_ref:txRef,amount,currency:"NGN",redirect_url:redirectUrl.toString(),payment_options:"card",
    customer:{email:customerEmail,name:artist.name||customerEmail.split("@")[0]},
    meta:{payment_kind:"distribution_invoice",distribution_payment_id:payment.id,invoice_id:invoice.id,billing_account_id:invoice.billing_account_id,user_id:user.id},
    customizations:{title:"MALPINOHdistro",description:"Invoice "+invoice.invoice_number+" — "+invoice.description,logo:"https://malpinohdistro.com.ng/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png"}
  })});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.status!=="success"||!result.data?.link){
    await db.from("distribution_payments").update({status:"rejected",note:"Checkout initialization failed"}).eq("id",payment.id);
    console.error("Flutterwave invoice checkout failed",result);
    return json({error:"Could not start card checkout. Please try again or use a bank transfer."},502);
  }
  return json({success:true,checkout_url:result.data.link,payment_id:payment.id,tx_ref:txRef,amount});
 } catch(e){console.error("[distribution-invoice-checkout]",e);return json({error:e instanceof Error?e.message:"Unexpected error"},500);}
});