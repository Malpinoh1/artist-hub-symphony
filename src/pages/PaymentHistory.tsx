import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Download, Calendar, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Payment {
  id: string; flutterwave_tx_ref: string; flutterwave_transaction_id: string | null;
  amount_usd: number; amount_charged: number; currency: string;
  payment_method: string | null; status: string; created_at: string;
  plans: { name: string } | null;
}
interface Sub {
  id: string; status: string; start_date: string; end_date: string;
  auto_renew: boolean; plan_id: string; plans: { name: string; price_usd: number } | null;
}

const statusVariant = (s: string) => s === 'successful' ? 'default' : s === 'pending' ? 'secondary' : 'destructive';

const PaymentHistory = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'successful' | 'pending' | 'failed'>('all');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pays }, { data: subs }] = await Promise.all([
      supabase.from('payments').select('*, plans(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, plans(name, price_usd)').eq('user_id', user.id).order('end_date', { ascending: false }).limit(1),
    ]);
    setPayments((pays as any) || []);
    setSub(((subs as any) || [])[0] || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => filter === 'all' ? payments : payments.filter(p => p.status === filter), [payments, filter]);

  const toggleAutoRenew = async (val: boolean) => {
    if (!sub) return;
    const { error } = await supabase.from('subscriptions').update({ auto_renew: val }).eq('id', sub.id);
    if (error) { toast.error('Could not update'); return; }
    setSub({ ...sub, auto_renew: val });
    toast.success(val ? 'Auto-renew enabled' : 'Auto-renew disabled');
  };

  const downloadReceipt = (p: Payment) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${p.flutterwave_tx_ref}</title>
      <style>body{font-family:system-ui;padding:40px;max-width:600px;margin:auto}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:8px 0;border-bottom:1px solid #eee}</style></head>
      <body><h1>MALPINOHdistro</h1><p>Payment Receipt</p>
      <table>
        <tr><td>Reference</td><td><b>${p.flutterwave_tx_ref}</b></td></tr>
        <tr><td>Transaction ID</td><td>${p.flutterwave_transaction_id || '—'}</td></tr>
        <tr><td>Plan</td><td>${p.plans?.name || '—'}</td></tr>
        <tr><td>Amount (USD)</td><td>$${Number(p.amount_usd).toFixed(2)}</td></tr>
        <tr><td>Amount charged</td><td>${p.currency} ${Number(p.amount_charged).toLocaleString()}</td></tr>
        <tr><td>Method</td><td>${p.payment_method || '—'}</td></tr>
        <tr><td>Status</td><td>${p.status}</td></tr>
        <tr><td>Date</td><td>${new Date(p.created_at).toLocaleString()}</td></tr>
      </table><p style="margin-top:32px;color:#666;font-size:12px">Thank you for your payment.</p></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `receipt-${p.flutterwave_tx_ref}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and view past payments.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" /> Current Plan</h2>
        {sub ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">{sub.plans?.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Calendar className="h-4 w-4" />
                  Renews on {new Date(sub.end_date).toLocaleDateString()}
                </div>
              </div>
              <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-sm font-medium">Auto-renew</div>
                <div className="text-xs text-muted-foreground">Automatically charge your card before expiry</div>
              </div>
              <Switch checked={sub.auto_renew} onCheckedChange={toggleAutoRenew} />
            </div>
            <Link to="/pricing" className="inline-block mt-2 text-sm text-primary underline">Change plan</Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">You don't have an active subscription.</p>
            <Link to="/pricing" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium">Choose a plan</Link>
          </div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Payment History</h2>
          <div className="flex gap-1 text-xs">
            {(['all','successful','pending','failed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md capitalize ${filter===f?'bg-primary text-primary-foreground':'bg-secondary'}`}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No payments to show.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b border-border">
                  <tr><th className="py-2 px-3">Date</th><th className="px-3">Plan</th><th className="px-3">Amount</th><th className="px-3">Method</th><th className="px-3">Status</th><th className="px-3">Receipt</th></tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-3 px-3">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-3">{p.plans?.name || '—'}</td>
                      <td className="px-3">${Number(p.amount_usd).toFixed(2)} <span className="text-xs text-muted-foreground">({p.currency} {Number(p.amount_charged).toLocaleString()})</span></td>
                      <td className="px-3 capitalize">{p.payment_method || '—'}</td>
                      <td className="px-3"><Badge variant={statusVariant(p.status) as any}>{p.status}</Badge></td>
                      <td className="px-3">{p.status==='successful' && <button onClick={()=>downloadReceipt(p)} className="text-primary inline-flex items-center gap-1 text-xs"><Download className="h-3.5 w-3.5"/>Download</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="border border-border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{p.plans?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <Badge variant={statusVariant(p.status) as any}>{p.status}</Badge>
                  </div>
                  <div className="text-sm">${Number(p.amount_usd).toFixed(2)} <span className="text-xs text-muted-foreground">· {p.payment_method || '—'}</span></div>
                  {p.status==='successful' && <button onClick={()=>downloadReceipt(p)} className="mt-2 text-primary inline-flex items-center gap-1 text-xs"><Download className="h-3.5 w-3.5"/>Receipt</button>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
