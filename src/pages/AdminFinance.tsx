import React, { useEffect, useMemo, useState } from 'react';
import AnimatedCard from '../components/AnimatedCard';
import { toast } from 'sonner';
import { Wallet, Banknote, TrendingUp, Users, ShieldCheck } from 'lucide-react';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import ArtistsEarningsTab from '@/components/admin/ArtistsEarningsTab';
import PlatformEarningsTab from '@/components/admin/PlatformEarningsTab';
import RoyaltyStatementsTab from '@/components/admin/RoyaltyStatementsTab';
import RoyaltyUploadTab from '@/components/admin/RoyaltyUploadTab';
import IncomeManagementTab from '@/components/admin/IncomeManagementTab';
import PaymentsAnalyticsTab from '@/components/admin/PaymentsAnalyticsTab';
import SubscriptionManagement from '@/components/admin/SubscriptionManagement';
import AdminCreditManager from '@/components/admin/AdminCreditManager';
import PlatformStreamAnalytics from '@/components/admin/PlatformStreamAnalytics';
import {
  fetchAdminWithdrawals,
  fetchArtistsEarningSummary,
} from '../services/adminService';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Navigate, Link } from 'react-router-dom';

const TABS = [
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'royalty-upload', label: 'Upload Royalties (CSV)' },
  { id: 'royalty-statements', label: 'Royalty Statements' },
  { id: 'platform-earnings', label: 'Platform Earnings' },
  { id: 'earnings', label: 'Artist Earnings' },
  { id: 'income-management', label: 'Income & Royalties' },
  { id: 'payments', label: 'Payments & Revenue' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'credit-balance', label: 'Credit Balance' },
];

const StatCard = ({ icon: Icon, label, value, accent }: any) => (
  <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminFinance: React.FC = () => {
  const { loading: roleLoading, isAdmin, isFinance } = useAdminRole();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('withdrawals');

  const refresh = async () => {
    setLoading(true);
    try {
      const [w, e] = await Promise.all([
        fetchAdminWithdrawals(),
        fetchArtistsEarningSummary(),
      ]);
      setWithdrawals(w || []); setEarnings(e || []);
    } catch (err) {
      console.error(err); toast.error('Failed to load finance dashboard');
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => {
    const pendingW = withdrawals.filter((x: any) => x.status === 'PENDING');
    const approvedW = withdrawals.filter((x: any) => x.status === 'APPROVED' || x.status === 'COMPLETED');
    const rejectedW = withdrawals.filter((x: any) => x.status === 'REJECTED');
    const totalEarnings = earnings.reduce((s: number, a: any) => s + (a.total_earnings || 0), 0);
    const pendingAmount = pendingW.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0);
    return {
      pendingCount: pendingW.length,
      approvedCount: approvedW.length,
      rejectedCount: rejectedW.length,
      totalEarnings, pendingAmount, artistCount: earnings.length,
    };
  }, [withdrawals, earnings]);

  if (roleLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>;
  }
  if (!isAdmin && !isFinance) return <Navigate to="/dashboard" replace />;

  const handleWithdrawalUpdate = (id: string, _status: string, updated: any = null) => {
    if (updated) setWithdrawals(prev => prev.map(w => w.id === id ? updated : w));
    else refresh();
  };

  return (
    <div className="container mx-auto px-3 sm:px-4">
      <AnimatedCard>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Finance &amp; Royalty Manager
            </div>
            <h1 className="text-xl sm:text-3xl font-display font-bold">Finance Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage withdrawals, royalties, and platform revenue.</p>
          </div>
          {isAdmin && (
            <Link to="/admin" className="text-sm text-primary hover:underline">← Super Admin</Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Wallet} label="Pending withdrawals" value={stats.pendingCount} accent="bg-amber-500/15 text-amber-500" />
          <StatCard icon={Wallet} label="Pending amount" value={fmt(stats.pendingAmount)} accent="bg-amber-500/15 text-amber-500" />
          <StatCard icon={Banknote} label="Approved / paid" value={stats.approvedCount} accent="bg-emerald-500/15 text-emerald-500" />
          <StatCard icon={Banknote} label="Rejected" value={stats.rejectedCount} accent="bg-rose-500/15 text-rose-500" />
          <StatCard icon={TrendingUp} label="Total royalties paid" value={fmt(stats.totalEarnings)} accent="bg-primary/15 text-primary" />
          <StatCard icon={Users} label="Earning artists" value={stats.artistCount} accent="bg-primary/15 text-primary" />
        </div>

        <div className="border-b border-border mb-4 -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex overflow-x-auto space-x-1 pb-1 -mb-px scrollbar-thin">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`min-h-[44px] px-3 py-2 border-b-2 whitespace-nowrap text-sm ${
                  activeTab === t.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-primary'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-6">
          {activeTab === 'withdrawals' && (
            <WithdrawalsTab withdrawals={withdrawals} loading={loading} onWithdrawalUpdate={handleWithdrawalUpdate} />
          )}
          {activeTab === 'royalty-upload' && <RoyaltyUploadTab />}
          {activeTab === 'royalty-statements' && <RoyaltyStatementsTab onStatementUpdate={refresh} />}
          {activeTab === 'platform-earnings' && <PlatformEarningsTab onGenerateStatement={refresh} />}
          {activeTab === 'earnings' && (
            <ArtistsEarningsTab artistsEarnings={earnings} loading={loading} onArtistUpdate={refresh} />
          )}
          {activeTab === 'income-management' && <IncomeManagementTab />}
          {activeTab === 'payments' && <PaymentsAnalyticsTab />}
          {activeTab === 'subscriptions' && <SubscriptionManagement />}
          {activeTab === 'credit-balance' && <AdminCreditManager />}
        </div>
      </AnimatedCard>
    </div>
  );
};

export default AdminFinance;
