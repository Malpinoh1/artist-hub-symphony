import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, RefreshCw, ReceiptText, CreditCard, Landmark, Download, AlertCircle } from 'lucide-react';

const db: any = supabase;
const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value) || 0);
const statusLabel: Record<string, string> = { draft: 'Draft', issued: 'Issued', partially_paid: 'Partially paid', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };
const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => status === 'paid' ? 'default' : ['partially_paid','overdue'].includes(status) ? 'destructive' : status === 'issued' ? 'secondary' : 'outline';

export default function Billing() {
  const { currentAccountId } = useAccount();
  const { canManage } = useTeamPermissions();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [bankSettings, setBankSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [transferInvoice, setTransferInvoice] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const load = async () => {
    if (!currentAccountId) return;
    setLoading(true);
    try {
      const [i, p, r, s] = await Promise.all([
        db.from('distribution_invoices').select('*').eq('billing_account_id', currentAccountId).order('created_at', { ascending: false }),
        db.from('distribution_payments').select('*').eq('billing_account_id', currentAccountId).order('recorded_at', { ascending: false }),
        db.from('distribution_receipts').select('*').eq('billing_account_id', currentAccountId).order('issued_at', { ascending: false }),
        db.from('distribution_payment_settings').select('bank_name,account_name,account_number,transfer_instructions').eq('id', true).maybeSingle(),
      ]);
      if (i.error) throw i.error;
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      setInvoices(i.data || []); setPayments(p.data || []); setReceipts(r.data || []); setBankSettings(s.data || null);
    } catch (e: any) { toast.error(e?.message || 'Could not load billing information'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [currentAccountId]);

  const totalOwed = invoices.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + Number(i.amount_due || 0), 0);
  const payable = (i: any) => ['issued','partially_paid','overdue'].includes(i.status) && Number(i.amount_due) > 0;

  const payByCard = async (invoice: any) => {
    const amount = Number(amounts[invoice.id] || invoice.amount_due);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Number(invoice.amount_due)) {
      toast.error('Enter a whole-NGN amount no greater than the outstanding balance'); return;
    }
    setPayingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('distribution-invoice-checkout', { body: { invoice_id: invoice.id, amount } });
      if (error || !data?.success || !data?.checkout_url) throw new Error(data?.error || error?.message || 'Could not start card payment');
      window.location.assign(data.checkout_url);
    } catch (e: any) { toast.error(e?.message || 'Could not start card payment'); setPayingId(null); }
  };

  const submitTransferNotice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferInvoice) return;
    const amount = Number(transferAmount);
    const invoice = invoices.find(i => i.id === transferInvoice);
    if (!invoice || !Number.isSafeInteger(amount) || amount <= 0 || amount > Number(invoice.amount_due)) {
      toast.error('Enter a valid payment amount within the outstanding balance'); return;
    }
    setPayingId(transferInvoice);
    try {
      const { data, error } = await supabase.functions.invoke('distribution-billing-admin', {
        body: { action: 'submit_bank_transfer', invoice_id: transferInvoice, amount, transaction_reference: transferReference, note: transferNote },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Could not submit transfer notice');
      toast.success('Transfer notice submitted. Your balance will update after MALPINOHdistro verifies the funds.');
      setTransferInvoice(null); setTransferAmount(''); setTransferReference(''); setTransferNote('');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Could not submit transfer notice'); }
    finally { setPayingId(null); }
  };

  const downloadReceipt = (receipt: any) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.receipt_number}</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;padding:24px;color:#111}h1{margin-bottom:4px}.muted{color:#666}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}</style></head><body><h1>MALPINOHdistro</h1><p class="muted">Payment receipt</p><h2>${receipt.receipt_number}</h2><div class="row"><span>Payment received</span><b>${money(Number(receipt.amount))}</b></div><div class="row"><span>Invoice total</span><b>${money(Number(receipt.total_invoice_amount))}</b></div><div class="row"><span>Paid to date</span><b>${money(Number(receipt.total_paid_after_payment))}</b></div><div class="row"><span>Outstanding balance</span><b>${money(Number(receipt.remaining_balance))}</b></div><div class="row"><span>Date</span><b>${new Date(receipt.issued_at).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})}</b></div><p class="muted">Thank you for choosing MALPINOHdistro.</p><script>window.print()</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `MALPINOHdistro-${receipt.receipt_number}.html`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-0 sm:px-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Billing &amp; payments</p><h1 className="text-2xl font-bold sm:text-3xl">My invoices</h1><p className="mt-1 text-sm text-muted-foreground">View distribution fees, pay in instalments, and download receipts.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Outstanding amount</CardDescription><CardTitle className="text-2xl text-destructive">{money(totalOwed)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Unpaid distribution invoice balances</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Invoices</CardDescription><CardTitle className="text-2xl">{invoices.filter(i => i.status !== 'cancelled').length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Including paid and partially paid</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Receipts</CardDescription><CardTitle className="text-2xl">{receipts.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Confirmed payments recorded</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Landmark className="h-5 w-5" />Bank transfer details</CardTitle><CardDescription>Use these official MALPINOHdistro details for direct transfers.</CardDescription></CardHeader>
        <CardContent>
          {bankSettings?.bank_name && bankSettings?.account_name && bankSettings?.account_number ? <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Bank</p><p className="font-semibold">{bankSettings.bank_name}</p></div>
            <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Account name</p><p className="font-semibold">{bankSettings.account_name}</p></div>
            <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Account number</p><p className="font-semibold tracking-wide">{bankSettings.account_number}</p></div>
            {bankSettings.transfer_instructions && <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Instructions</p><p className="whitespace-pre-wrap text-sm">{bankSettings.transfer_instructions}</p></div>}
          </div> : <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>Official bank details have not been configured yet. Please contact MALPINOHdistro support before making a transfer.</span></div>}
          <p className="mt-3 text-xs text-muted-foreground">After sending a transfer, choose “I paid by bank transfer” on the relevant invoice and submit the amount and bank reference. Your balance changes only after finance verifies the funds.</p>
        </CardContent>
      </Card>

      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading your invoices…</div> : invoices.length === 0 ? <Card><CardContent className="py-12 text-center"><ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">No distribution invoices yet</h2><p className="mt-1 text-sm text-muted-foreground">Invoices created by MALPINOHdistro will appear here.</p></CardContent></Card> : <div className="space-y-4">{invoices.map(invoice => {
        const invoicePayments = payments.filter(p => p.invoice_id === invoice.id);
        const invoiceReceipts = receipts.filter(r => r.invoice_id === invoice.id);
        return <Card key={invoice.id}>
          <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="text-lg">{invoice.invoice_number}</CardTitle><CardDescription>{invoice.description}{invoice.due_at ? ` · Due ${new Date(invoice.due_at).toLocaleDateString('en-GB',{timeZone:'Africa/Lagos'})}` : ''}</CardDescription></div>
            <Badge variant={statusVariant(invoice.status)}>{statusLabel[invoice.status] || invoice.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Invoice total</p><p className="text-lg font-semibold">{money(Number(invoice.total_amount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Paid to date</p><p className="text-lg font-semibold text-emerald-600">{money(Number(invoice.amount_paid))}</p></div>
              <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold text-destructive">{money(Number(invoice.amount_due))}</p></div>
            </div>
            {invoice.allow_release_before_full_payment && <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>A one-time release exception has been approved for the release linked to this invoice. The outstanding amount is still owed.</span></div>}
            {payable(invoice) && canManage && <div className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div className="space-y-2"><Label htmlFor={`pay-${invoice.id}`}>Amount to pay (NGN)</Label><Input id={`pay-${invoice.id}`} type="number" min="1" max={Number(invoice.amount_due)} step="1" value={amounts[invoice.id] ?? String(invoice.amount_due)} onChange={e => setAmounts(prev => ({...prev,[invoice.id]:e.target.value}))} /></div><Button onClick={() => void payByCard(invoice)} disabled={payingId === invoice.id}><CreditCard className="mr-2 h-4 w-4" />{payingId === invoice.id ? 'Opening checkout…' : 'Pay by card'}</Button></div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setTransferInvoice(invoice.id); setTransferAmount(String(invoice.amount_due)); }}><Landmark className="mr-2 h-4 w-4" />I paid by bank transfer</Button>
              <p className="text-xs text-muted-foreground">Card payments are confirmed by Flutterwave verification. Bank transfers remain pending until MALPINOHdistro finance verifies the funds.</p>
            </div>}
            {invoicePayments.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Payment history</h3><div className="space-y-2">{invoicePayments.map(p => <div key={p.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{money(Number(p.amount))} · {p.method.replaceAll('_',' ')}</p><p className="text-xs text-muted-foreground">{p.transaction_reference || p.provider_reference || 'Reference not provided'} · {new Date(p.recorded_at).toLocaleDateString('en-GB')}</p></div><Badge variant={p.status === 'confirmed' ? 'default' : p.status === 'pending_verification' ? 'secondary' : 'outline'}>{p.status.replaceAll('_',' ')}</Badge></div>)}</div></div>}
            {invoiceReceipts.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Receipts</h3><div className="flex flex-wrap gap-2">{invoiceReceipts.map(r => <Button key={r.id} variant="outline" size="sm" onClick={() => downloadReceipt(r)}><Download className="mr-2 h-4 w-4" />{r.receipt_number}</Button>)}</div></div>}
          </CardContent>
        </Card>;
      })}</div>}

      {transferInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="transfer-notice-title"><Card className="w-full max-w-lg"><CardHeader><CardTitle id="transfer-notice-title">Submit bank transfer notice</CardTitle><CardDescription>Only submit this after you have sent the transfer to MALPINOHdistro's official bank account.</CardDescription></CardHeader><CardContent><form onSubmit={submitTransferNotice} className="space-y-4"><div className="space-y-2"><Label htmlFor="transfer-amount">Amount sent (NGN)</Label><Input id="transfer-amount" type="number" min="1" max={Number(invoices.find(i => i.id === transferInvoice)?.amount_due || 0)} step="1" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="transfer-reference">Bank transaction reference</Label><Input id="transfer-reference" value={transferReference} onChange={e => setTransferReference(e.target.value)} placeholder="Enter bank reference if available" maxLength={160} /></div><div className="space-y-2"><Label htmlFor="transfer-note">Note (optional)</Label><Textarea id="transfer-note" value={transferNote} onChange={e => setTransferNote(e.target.value)} rows={2} maxLength={1000} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setTransferInvoice(null)}>Cancel</Button><Button type="submit" disabled={payingId === transferInvoice}>{payingId === transferInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit notice</Button></div></form></CardContent></Card></div>}
    </div>
  );
}
