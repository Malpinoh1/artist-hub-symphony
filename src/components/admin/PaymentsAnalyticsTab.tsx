import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Calendar, AlertCircle, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Payment {
  id: string; user_id: string; flutterwave_tx_ref: string; flutterwave_transaction_id: string | null;
  amount_usd: number; amount_charged: number; currency: string; payment_method: string | null;
  status: string; customer_email: string | null; created_at: string;
  plans: { name: string } | null;
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="glass-panel p-4 rounded-xl">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      </div>
      <Icon className={`h-8 w-8 ${color} opacity-50`} />
    </div>
  </div>
);

const PaymentsAnalyticsTab = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeSubs, setActiveSubs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'successful'|'pending'|'failed'>('all');

  useEffect(() => { (async () => {
    const [{ data: pays }, { count }] = await Promise.all([
      supabase.from('payments').select('*, plans(name)').order('created_at', { ascending: false }).limit(500),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    setPayments((pays as any) || []);
    setActiveSubs(count || 0);
    setLoading(false);
  })(); }, []);

  const stats = useMemo(() => {
    const successful = payments.filter(p => p.status === 'successful');
    const today = new Date(); today.setHours(0,0,0,0);
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
    return {
      total: successful.reduce((s,p)=>s+Number(p.amount_usd),0),
      today: successful.filter(p=>new Date(p.created_at)>=today).reduce((s,p)=>s+Number(p.amount_usd),0),
      month: successful.filter(p=>new Date(p.created_at)>=thisMonth).reduce((s,p)=>s+Number(p.amount_usd),0),
      failed: payments.filter(p=>p.status==='failed').length,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    let r = payments;
    if (filter !== 'all') r = r.filter(p => p.status === filter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(p => p.flutterwave_tx_ref?.toLowerCase().includes(s) || p.customer_email?.toLowerCase().includes(s) || p.flutterwave_transaction_id?.toLowerCase().includes(s));
    }
    return r;
  }, [payments, filter, search]);

  const refund = async (p: Payment) => {
    if (!p.flutterwave_transaction_id) { return alert('Missing transaction id'); }
    if (!confirm(`Refund $${p.amount_usd} to ${p.customer_email}?`)) return;
    alert('Refund must be processed via the Flutterwave dashboard. Mark this payment as refunded after.');
    await supabase.from('payments').update({ status: 'refunded' }).eq('id', p.id);
    setPayments(prev => prev.map(x => x.id===p.id?{...x,status:'refunded'}:x));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.total.toFixed(2)}`} color="text-emerald-500" />
        <StatCard icon={Calendar} label="Today" value={`$${stats.today.toFixed(2)}`} color="text-blue-500" />
        <StatCard icon={TrendingUp} label="This Month" value={`$${stats.month.toFixed(2)}`} color="text-purple-500" />
        <StatCard icon={Users} label="Active Subs" value={activeSubs} color="text-amber-500" />
        <StatCard icon={AlertCircle} label="Failed" value={stats.failed} color="text-destructive" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Search ref, email, txn id…" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-1 text-xs">
          {(['all','successful','pending','failed'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-md capitalize ${filter===f?'bg-primary text-primary-foreground':'bg-secondary'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto glass-panel rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 px-3">Date</th><th className="px-3">Reference</th><th className="px-3">Email</th>
              <th className="px-3">Plan</th><th className="px-3">Amount</th><th className="px-3">Method</th>
              <th className="px-3">Status</th><th className="px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="py-2 px-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-3 font-mono text-xs">{p.flutterwave_tx_ref}</td>
                <td className="px-3">{p.customer_email}</td>
                <td className="px-3">{p.plans?.name || '—'}</td>
                <td className="px-3 whitespace-nowrap">${Number(p.amount_usd).toFixed(2)}</td>
                <td className="px-3 capitalize">{p.payment_method || '—'}</td>
                <td className="px-3"><Badge variant={p.status==='successful'?'default':p.status==='pending'?'secondary':'destructive'}>{p.status}</Badge></td>
                <td className="px-3">{p.status==='successful' && <button onClick={()=>refund(p)} className="text-xs text-destructive underline">Refund</button>}</td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No payments</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsAnalyticsTab;
