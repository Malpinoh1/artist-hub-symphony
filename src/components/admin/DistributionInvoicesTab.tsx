import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, RefreshCw, FilePlus2, CheckCircle2, Clock3, AlertCircle } from 'lucide-react';

const db: any = supabase;
const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value) || 0);
const statusClass: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-blue-500/10 text-blue-600',
  partially_paid: 'bg-amber-500/10 text-amber-600',
  paid: 'bg-emerald-500/10 text-emerald-600',
  overdue: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  pending_verification: 'bg-amber-500/10 text-amber-600',
  confirmed: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function DistributionInvoicesTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [description, setDescription] = useState('One-time music distribution');
  const [amount, setAmount] = useState('13563');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [allowException, setAllowException] = useState(false);
  const [issueNow, setIssueNow] = useState(true);
  const [transferInvoice, setTransferInvoice] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferNote, setTransferNote] = useState('Part payment for one-time music distribution');
  const [verifiedPayment, setVerifiedPayment] = useState<string | null>(null);
  const [busyPayment, setBusyPayment] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, r, i, p] = await Promise.all([
        db.from('artists').select('id,name,email,account_type,account_name').order('name'),
        db.from('releases').select('id,title,artist_id,artist_account_id').order('created_at', { ascending: false }).limit(500),
        db.from('distribution_invoices').select('*').order('created_at', { ascending: false }).limit(200),
        db.from('distribution_payments').select('*').order('recorded_at', { ascending: false }).limit(200),
      ]);
      if (a.error) throw a.error;
      if (r.error) throw r.error;
      if (i.error) throw i.error;
      if (p.error) throw p.error;
      setAccounts(a.data || []);
      setReleases(r.data || []);
      setInvoices(i.data || []);
      setPayments(p.data || []);
      if (!accountId && a.data?.[0]?.id) setAccountId(a.data[0].id);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load distribution invoices');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const accountReleases = releases.filter(r => {
    if (!accountId) return false;
    return r.artist_id === accountId || accounts.some(a => a.id === accountId && r.artist_account_id && a.id === r.artist_account_id);
  });

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!accountId) return toast.error('Select an artist or label account');
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) return toast.error('Enter a positive whole-NGN amount');
    if (allowException && !releaseId) return toast.error('Select the specific release for the release exception');
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('distribution-billing-admin', {
        body: {
          action: 'create_invoice',
          billing_account_id: accountId,
          release_id: releaseId || null,
          description,
          total_amount: numericAmount,
          due_at: dueDate ? new Date(dueDate + 'T23:59:00+01:00').toISOString() : null,
          internal_notes: notes,
          issue_now: issueNow,
          allow_release_before_full_payment: allowException,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Invoice creation failed');
      toast.success(issueNow ? `Invoice ${data.invoice.invoice_number} issued` : `Invoice ${data.invoice.invoice_number} saved as draft`);
      setDescription('One-time music distribution'); setAmount('13563'); setDueDate(''); setNotes('');
      setReleaseId(''); setAllowException(false); setIssueNow(true);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Could not create invoice'); }
    finally { setSaving(false); }
  };

  const recordTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(transferAmount);
    if (!transferInvoice) return toast.error('Select an invoice');
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) return toast.error('Enter a positive whole-NGN amount');
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('distribution-billing-admin', {
        body: { action: 'record_bank_transfer', invoice_id: transferInvoice, amount: numericAmount, transaction_reference: transferReference, note: transferNote },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Could not record transfer');
      toast.success('Transfer recorded as pending verification. The invoice balance has not changed yet.');
      setTransferAmount(''); setTransferReference('');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Could not record transfer'); }
    finally { setSaving(false); }
  };

  const confirmPayment = async (paymentId: string) => {
    if (verifiedPayment !== paymentId) return toast.error('Confirm that the funds have been verified in the bank account');
    setBusyPayment(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke('distribution-billing-admin', {
        body: { action: 'confirm_payment', payment_id: paymentId, funds_verified: true },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Payment confirmation failed');
      toast.success(`Payment confirmed. Receipt ${data.payment.receipt_number || ''} created.`);
      setVerifiedPayment(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Could not confirm payment'); }
    finally { setBusyPayment(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-semibold">Distribution invoices</h2><p className="text-sm text-muted-foreground">Create fees, approve one-time release exceptions, and reconcile payments.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <form onSubmit={createInvoice} className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-primary" /><h3 className="font-semibold">Create invoice</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="invoice-account">Artist or label</Label><select id="invoice-account" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={accountId} onChange={e => { setAccountId(e.target.value); setReleaseId(''); }} required><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.account_name || a.name} — {a.account_type || 'artist'} ({a.email})</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="invoice-release">Release (optional unless exception enabled)</Label><select id="invoice-release" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={releaseId} onChange={e => setReleaseId(e.target.value)}><option value="">No release linked</option>{accountReleases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="invoice-description">Description</Label><Input id="invoice-description" value={description} onChange={e => setDescription(e.target.value)} required maxLength={240} /></div>
          <div className="space-y-2"><Label htmlFor="invoice-amount">Total fee (NGN)</Label><Input id="invoice-amount" type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="invoice-due">Due date (optional)</Label><Input id="invoice-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="invoice-notes">Internal notes (admin only)</Label><Textarea id="invoice-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <label className="flex items-start gap-3 text-sm"><Checkbox checked={allowException} onCheckedChange={v => setAllowException(v === true)} /><span><b>Allow this release before full payment</b><span className="block text-muted-foreground">Approval applies only to the selected release. The remaining fee remains owed.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><Checkbox checked={issueNow} onCheckedChange={v => setIssueNow(v === true)} /><span><b>Issue invoice immediately</b><span className="block text-muted-foreground">Publishes it to the billing page and queues the invoice email.</span></span></label>
        </div>
        <div><Button type="submit" disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create invoice</Button></div>
      </form>

      <form onSubmit={recordTransfer} className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
        <div><h3 className="font-semibold">Record a bank transfer</h3><p className="text-sm text-muted-foreground">Recording is not confirmation. The payment stays pending until finance verifies the funds.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="transfer-invoice">Invoice</Label><select id="transfer-invoice" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={transferInvoice} onChange={e => setTransferInvoice(e.target.value)} required><option value="">Select invoice</option>{invoices.filter(i => ['issued','partially_paid','overdue'].includes(i.status)).map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {money(Number(i.amount_due))} remaining</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="transfer-amount">Amount received (NGN)</Label><Input id="transfer-amount" type="number" min="1" step="1" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="transfer-reference">Bank transaction reference (optional)</Label><Input id="transfer-reference" value={transferReference} onChange={e => setTransferReference(e.target.value)} maxLength={160} placeholder="Reference from bank statement" /></div>
          <div className="space-y-2"><Label htmlFor="transfer-note">Payment note</Label><Textarea id="transfer-note" value={transferNote} onChange={e => setTransferNote(e.target.value)} rows={2} /></div>
        </div>
        <div><Button type="submit" variant="secondary" disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record pending transfer</Button></div>
      </form>

      <section className="space-y-3">
        <h3 className="font-semibold">Invoices</h3>
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading invoices…</div> : invoices.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No distribution invoices yet.</div> : <div className="space-y-3">{invoices.map(i => {
          const account = accounts.find(a => a.id === i.billing_account_id);
          return <article key={i.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{i.invoice_number}</p><p className="text-sm text-muted-foreground">{account?.account_name || account?.name || 'Account'} · {i.description}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[i.status] || 'bg-muted'}`}>{String(i.status).replaceAll('_',' ')}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-muted-foreground">Total</p><p className="font-semibold">{money(Number(i.total_amount))}</p></div><div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-emerald-600">{money(Number(i.amount_paid))}</p></div><div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold text-destructive">{money(Number(i.amount_due))}</p></div></div>
            {i.allow_release_before_full_payment && <p className="mt-3 text-xs text-amber-600">One-time release exception enabled for the linked release.</p>}
          </article>;
        })}</div>}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Bank transfers awaiting verification</h3>
        {payments.filter(p => p.method === 'bank_transfer' && p.status === 'pending_verification').length === 0 ? <div className="rounded-xl border p-6 text-sm text-muted-foreground">No transfers awaiting verification.</div> : payments.filter(p => p.method === 'bank_transfer' && p.status === 'pending_verification').map(p => {
          const invoice = invoices.find(i => i.id === p.invoice_id);
          const account = accounts.find(a => a.id === p.billing_account_id);
          return <article key={p.id} className="rounded-xl border bg-card p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{money(Number(p.amount))} · {invoice?.invoice_number || 'Invoice'}</p><p className="text-sm text-muted-foreground">{account?.account_name || account?.name || 'Account'} · {p.transaction_reference || 'No transaction reference provided'}</p><p className="text-xs text-muted-foreground">{p.note}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs ${statusClass[p.status]}`}>Pending verification</span></div>
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted/40 p-3"><label className="flex items-start gap-3 text-sm"><Checkbox checked={verifiedPayment === p.id} onCheckedChange={v => setVerifiedPayment(v === true ? p.id : null)} /><span>I have verified that these funds are present in MALPINOHdistro's bank account.</span></label><div><Button onClick={() => void confirmPayment(p.id)} disabled={busyPayment === p.id || verifiedPayment !== p.id}>{busyPayment === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Confirm payment &amp; issue receipt</Button></div></div>
          </article>;
        })}
      </section>
    </div>
  );
}
