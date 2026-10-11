import React, { useState } from 'react';
import { CheckCircle2, Receipt, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_MESSAGE = `Hi MIDE BLAQ,

We have recorded your OPAY transfer and renewed your MALPINOHdistro subscription for 90 days.

Receipt reference: MANUAL-OPAY-20261011-MIDE-10200
Amount received: ₦10,200
90-day renewal fee: ₦10,000
Unapplied difference: ₦200
Subscription end date: 9 January 2027

Please retain this email for your records. Your releases remain subject to the normal review and approval process.

Thank you for choosing MALPINOHdistro.
MALPINOHdistro Support Team`;

export default function AdminManualPaymentTab() {
  const { toast } = useToast();
  const [email, setEmail] = useState('mideblaq001@gmail.com');
  const [amountReceived, setAmountReceived] = useState('10200');
  const [renewalFee, setRenewalFee] = useState('10000');
  const [durationDays, setDurationDays] = useState('90');
  const [paymentMethod, setPaymentMethod] = useState('OPAY transfer');
  const [reference, setReference] = useState('MANUAL-OPAY-20261011-MIDE-10200');
  const [subject, setSubject] = useState('Payment receipt — 90-day MALPINOHdistro renewal');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [confirmed, setConfirmed] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    if (!email.trim() || Number(amountReceived) <= 0 || Number(renewalFee) <= 0 || Number(durationDays) <= 0 || !reference.trim()) {
      toast({ title: 'Check payment details', description: 'Enter a valid email, amount, renewal fee, duration and receipt reference.', variant: 'destructive' });
      return;
    }
    if (Number(amountReceived) < Number(renewalFee)) {
      toast({ title: 'Payment is below the renewal fee', description: 'The amount received must cover the subscription fee.', variant: 'destructive' });
      return;
    }
    if (!confirmed) {
      toast({ title: 'Confirmation required', description: 'Confirm the transfer is credited and the recipient details are correct.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-process-manual-payment', {
        body: {
          email: email.trim(),
          amount_received_ngn: Number(amountReceived),
          subscription_fee_ngn: Number(renewalFee),
          duration_days: Number(durationDays),
          payment_method: paymentMethod.trim(),
          receipt_reference: reference.trim(),
          send_email: sendEmail,
          email_subject: subject.trim(),
          email_message: message,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Manual payment processing did not complete.');
      setResult(data);
      toast({ title: 'Manual renewal processed', description: 'Subscription, payment history and in-app notification have been updated.' });
      setConfirmed(false);
    } catch (e: any) {
      toast({ title: 'Could not process manual payment', description: e?.message || 'Please try again or contact engineering.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-6">
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
      <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
      <div>
        <h2 className="text-xl font-semibold">Manual Payment & Renewal</h2>
        <p className="text-sm text-muted-foreground">Record a bank or wallet transfer, activate the subscription for the selected duration, reconcile duplicate pending attempts, add an in-app notification and optionally email the receipt. Only use this after verifying funds have actually arrived.</p>
      </div>
    </div>
    <Card>
      <CardHeader><CardTitle>Payment details</CardTitle><CardDescription>All changes are submitted to a server-side admin-only function.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label>Artist account email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Total received (₦)</Label><Input type="number" min="1" value={amountReceived} onChange={e=>setAmountReceived(e.target.value)} /></div>
        <div className="space-y-2"><Label>Subscription fee (₦)</Label><Input type="number" min="1" value={renewalFee} onChange={e=>setRenewalFee(e.target.value)} /></div>
        <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" min="1" max="730" value={durationDays} onChange={e=>setDurationDays(e.target.value)} /></div>
        <div className="space-y-2"><Label>Payment method</Label><Input value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Unique receipt reference</Label><Input value={reference} onChange={e=>setReference(e.target.value)} /></div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Receipt email</CardTitle><CardDescription>The email is only sent if the email service accepts the request; acceptance is not a guarantee of inbox delivery.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3"><Checkbox id="manual-send-email" checked={sendEmail} onCheckedChange={v=>setSendEmail(v===true)} /><Label htmlFor="manual-send-email">Send receipt email after successful account update</Label></div>
        <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={e=>setSubject(e.target.value)} disabled={!sendEmail} /></div>
        <div className="space-y-2"><Label>Message</Label><Textarea value={message} onChange={e=>setMessage(e.target.value)} rows={12} disabled={!sendEmail} /></div>
        <div className="rounded-lg border p-3">
          <div className="flex items-start gap-3"><Checkbox id="manual-payment-confirm" checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)} /><Label htmlFor="manual-payment-confirm" className="text-sm leading-5">I confirm the transfer is credited, the artist email is correct, and I authorize recording this payment and activating the subscription.</Label></div>
        </div>
        <Button onClick={submit} disabled={busy || !confirmed} className="w-full sm:w-auto"><Send className="mr-2 h-4 w-4" />{busy ? 'Processing…' : 'Record Payment, Activate & Notify'}</Button>
      </CardContent>
    </Card>
    {result && <Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Process result</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <p><strong>Receipt reference:</strong> {result.receipt_reference}</p>
      <p><strong>Subscription end:</strong> {result.subscription_end ? new Date(result.subscription_end).toLocaleString() : '—'}</p>
      <p><strong>Payment:</strong> {result.payment_status || 'recorded'}</p>
      <p><strong>In-app notification:</strong> {result.notification_created ? 'Created' : 'Not confirmed'}</p>
      <p><strong>Email:</strong> {result.email_status || 'Not requested'}</p>
    </CardContent></Card>}
  </div>;
}
