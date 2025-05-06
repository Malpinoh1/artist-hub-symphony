
import React from 'react';
import { Music, Users, DollarSign, AlertTriangle } from 'lucide-react';

interface DashboardStatsProps {
  releasesCount: number;
  artistsCount: number;
  pendingWithdrawalsCount: number;
  takeDownRequestsCount: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  releasesCount,
  artistsCount,
  pendingWithdrawalsCount,
  takeDownRequestsCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="glass-panel p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Music className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{releasesCount}</h2>
            <p className="text-slate-600 dark:text-slate-400">Total Releases</p>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{artistsCount}</h2>
            <p className="text-slate-600 dark:text-slate-400">Active Artists</p>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {pendingWithdrawalsCount}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Pending Withdrawals</p>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {takeDownRequestsCount}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Take Down Requests</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
