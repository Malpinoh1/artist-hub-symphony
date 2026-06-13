import React, { useEffect, useMemo, useState } from 'react';
import AnimatedCard from '../components/AnimatedCard';
import { toast } from 'sonner';
import { Disc3, ShieldCheck, ClipboardList, Users } from 'lucide-react';
import ReleasesTab from '@/components/admin/ReleasesTab';
import ArtistsTab from '@/components/admin/ArtistsTab';
import SupportTicketsTab from '@/components/admin/SupportTicketsTab';
import TakeDownRequestsTab from '@/components/TakeDownRequestsTab';
import RoyaltySplitRequestsTab from '@/components/admin/RoyaltySplitRequestsTab';
import {
  fetchAdminReleases,
  fetchAdminArtists,
  fetchTakeDownRequestsCount,
} from '../services/adminService';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Navigate, Link } from 'react-router-dom';

const TABS = [
  { id: 'releases', label: 'Releases' },
  { id: 'artists', label: 'Artists' },
  { id: 'takedown', label: 'Take Down Requests' },
  { id: 'split-requests', label: 'Split Requests' },
  { id: 'support', label: 'Support Tickets' },
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

const AdminDistribution: React.FC = () => {
  const { loading: roleLoading, isAdmin, isDistribution } = useAdminRole();
  const [releases, setReleases] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [takeDownCount, setTakeDownCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('releases');

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, a, td] = await Promise.all([
        fetchAdminReleases(),
        fetchAdminArtists(),
        fetchTakeDownRequestsCount(),
      ]);
      setReleases(r || []); setArtists(a || []); setTakeDownCount(td || 0);
    } catch (e) {
      console.error(e); toast.error('Failed to load distribution dashboard');
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => {
    const pending = releases.filter((r: any) => (r.status || '').toLowerCase() === 'pending').length;
    const approved = releases.filter((r: any) => (r.status || '').toLowerCase() === 'approved').length;
    const rejected = releases.filter((r: any) => (r.status || '').toLowerCase() === 'rejected').length;
    return { pending, approved, rejected };
  }, [releases]);

  if (roleLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>;
  }
  if (!isAdmin && !isDistribution) return <Navigate to="/dashboard" replace />;

  const handleReleaseUpdate = (id: string, _status: string, updated: any = null) => {
    if (updated) {
      setReleases(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } else refresh();
  };

  return (
    <div className="container mx-auto px-3 sm:px-4">
      <AnimatedCard>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Distribution Manager
            </div>
            <h1 className="text-xl sm:text-3xl font-display font-bold">Distribution Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Review releases, manage takedowns, support artists.</p>
          </div>
          {isAdmin && (
            <Link to="/admin" className="text-sm text-primary hover:underline">← Super Admin</Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={ClipboardList} label="Pending releases" value={counts.pending} accent="bg-amber-500/15 text-amber-500" />
          <StatCard icon={Disc3} label="Approved" value={counts.approved} accent="bg-emerald-500/15 text-emerald-500" />
          <StatCard icon={Disc3} label="Rejected" value={counts.rejected} accent="bg-rose-500/15 text-rose-500" />
          <StatCard icon={Users} label="Artists" value={artists.length} accent="bg-primary/15 text-primary" />
        </div>

        <div className="border-b border-border mb-4 -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex overflow-x-auto space-x-1 pb-1 -mb-px scrollbar-thin">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`min-h-[44px] px-3 py-2 border-b-2 whitespace-nowrap text-sm flex items-center ${
                  activeTab === t.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-primary'
                }`}>
                {t.label}
                {t.id === 'takedown' && takeDownCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-destructive/15 text-destructive">{takeDownCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel p-2 sm:p-6">
          {activeTab === 'releases' && (
            <ReleasesTab releases={releases} loading={loading} onReleaseUpdate={handleReleaseUpdate} onRefreshData={refresh} />
          )}
          {activeTab === 'artists' && (
            <ArtistsTab artists={artists} loading={loading} onArtistUpdate={() => refresh()} />
          )}
          {activeTab === 'takedown' && <TakeDownRequestsTab />}
          {activeTab === 'split-requests' && <RoyaltySplitRequestsTab />}
          {activeTab === 'support' && <SupportTicketsTab />}
        </div>
      </AnimatedCard>
    </div>
  );
};

export default AdminDistribution;
