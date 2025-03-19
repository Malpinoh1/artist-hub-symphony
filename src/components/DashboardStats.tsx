
import React from 'react';
import { Music, Disc, BarChart3, DollarSign } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    up: boolean;
  };
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, loading = false }) => {
  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
            trend.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {loading ? (
        <>
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse"></div>
        </>
      ) : (
        <>
          <h3 className="text-2xl font-display font-semibold text-slate-900">{value}</h3>
          <p className="text-sm text-slate-500 mt-1">{title}</p>
        </>
      )}
    </div>
  );
};

interface DashboardStatsProps {
  totalReleases: number;
  activeReleases: number;
  totalPlays: number;
  totalEarnings: number;
  loading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalReleases,
  activeReleases,
  totalPlays,
  totalEarnings,
  loading = false
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatsCard
        title="Total Releases"
        value={totalReleases}
        icon={<Music className="w-5 h-5 text-blue-600" />}
        loading={loading}
      />
      <StatsCard
        title="Active Releases"
        value={activeReleases}
        icon={<Disc className="w-5 h-5 text-blue-600" />}
        loading={loading}
      />
      <StatsCard
        title="Total Plays"
        value={totalPlays.toLocaleString()}
        icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
        trend={{
          value: "8.2%",
          up: true
        }}
        loading={loading}
      />
      <StatsCard
        title="Total Earnings"
        value={`$${totalEarnings.toFixed(2)}`}
        icon={<DollarSign className="w-5 h-5 text-blue-600" />}
        trend={{
          value: "12.5%",
          up: true
        }}
        loading={loading}
      />
    </div>
  );
};

export default DashboardStats;
