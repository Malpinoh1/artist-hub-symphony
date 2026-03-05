
import React from 'react';
import { Music, Users, DollarSign, AlertTriangle, Wallet, Database } from 'lucide-react';

interface DashboardStatsProps {
  releasesCount: number;
  artistsCount: number;
  pendingWithdrawalsCount: number;
  takeDownRequestsCount: number;
  totalArtistEarnings?: number;
  pendingWithdrawalsAmount?: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  releasesCount,
  artistsCount,
  pendingWithdrawalsCount,
  takeDownRequestsCount,
  totalArtistEarnings = 0,
  pendingWithdrawalsAmount = 0
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const stats = [
    { icon: Music, label: 'Total Releases', value: releasesCount, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    { icon: Users, label: 'Active Artists', value: artistsCount, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    { icon: Database, label: 'Pending Withdrawals', value: pendingWithdrawalsCount, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    { icon: DollarSign, label: 'Total Earnings', value: formatCurrency(totalArtistEarnings), bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    { icon: Wallet, label: 'Pending Amount', value: formatCurrency(pendingWithdrawalsAmount), bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
    { icon: AlertTriangle, label: 'Take Down Requests', value: takeDownRequestsCount, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="glass-panel p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${stat.text}`} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg lg:text-xl font-bold text-foreground truncate">{stat.value}</h2>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
