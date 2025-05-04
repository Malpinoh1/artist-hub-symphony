
import React from 'react';
import { DollarSign, Clock, ArrowUpRight } from 'lucide-react';
import StatCard from './StatCard';

export interface StatsData {
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
}

interface StatsCardsProps {
  stats: StatsData;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
      <StatCard
        icon={<DollarSign />}
        title="Total Earnings"
        value={stats.totalEarnings}
        description="Lifetime earnings from all streams"
        iconBgColor="bg-blue-100"
        iconTextColor="text-blue-600"
      />
      
      <StatCard
        icon={<Clock />}
        title="Pending Earnings"
        value={stats.pendingEarnings}
        description="Earnings being processed"
        iconBgColor="bg-amber-100"
        iconTextColor="text-amber-600"
        delay={100}
      />
      
      <StatCard
        icon={<ArrowUpRight />}
        title="Available Balance"
        value={stats.availableBalance}
        description="Amount available for withdrawal"
        iconBgColor="bg-green-100"
        iconTextColor="text-green-600"
        delay={200}
      />
    </div>
  );
};

export default StatsCards;
