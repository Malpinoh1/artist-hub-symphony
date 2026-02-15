
import React from 'react';
import { DollarSign, Clock, ArrowUpRight, CreditCard } from 'lucide-react';
import StatCard from './StatCard';

export interface StatsData {
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  creditBalance?: number;
}

interface StatsCardsProps {
  stats: StatsData;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <StatCard
        icon={<DollarSign />}
        title="Total Earnings"
        value={stats.totalEarnings}
        description="Lifetime earnings from all streams"
        iconBgColor="bg-blue-100"
        iconTextColor="text-blue-600"
        currencySymbol="$"
      />
      
      <StatCard
        icon={<Clock />}
        title="Pending Earnings"
        value={stats.pendingEarnings}
        description="Earnings being processed"
        iconBgColor="bg-amber-100"
        iconTextColor="text-amber-600"
        delay={100}
        currencySymbol="$"
      />
      
      <StatCard
        icon={<ArrowUpRight />}
        title="Available Balance"
        value={stats.availableBalance}
        description="Amount available for withdrawal"
        iconBgColor="bg-green-100"
        iconTextColor="text-green-600"
        delay={200}
        currencySymbol="$"
      />

      {(stats.creditBalance || 0) > 0 && (
        <StatCard
          icon={<CreditCard />}
          title="Credit Balance"
          value={stats.creditBalance || 0}
          description="Outstanding subscription/credit owed"
          iconBgColor="bg-red-100"
          iconTextColor="text-red-600"
          delay={300}
          currencySymbol="$"
        />
      )}
    </div>
  );
};

export default StatsCards;
