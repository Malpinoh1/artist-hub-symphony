
import React from 'react';
import { Download, Calendar } from 'lucide-react';
import AnimatedCard from '../AnimatedCard';
import EarningsTable, { EarningData } from './EarningsTable';
import WithdrawalsTable, { WithdrawalData } from './WithdrawalsTable';

interface ActivityPanelProps {
  earnings: EarningData[];
  withdrawals: WithdrawalData[];
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ earnings, withdrawals }) => {
  return (
    <AnimatedCard className="lg:col-span-2" delay={100}>
      <div className="glass-panel p-6 h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <div className="flex gap-2">
            <button className="text-xs p-2 rounded bg-slate-100 hover:bg-slate-200 flex items-center gap-1">
              <Download className="w-3 h-3" />
              Export
            </button>
            <button className="text-xs p-2 rounded bg-slate-100 hover:bg-slate-200 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Filter
            </button>
          </div>
        </div>
        
        {withdrawals.length > 0 && (
          <>
            <div className="space-y-1 mb-4">
              <h4 className="font-medium text-slate-700">Withdrawals</h4>
            </div>
            <WithdrawalsTable withdrawals={withdrawals} />
          </>
        )}
        
        {earnings.length > 0 && (
          <>
            <div className="space-y-1 mb-4">
              <h4 className="font-medium text-slate-700">Earnings</h4>
            </div>
            <EarningsTable earnings={earnings} />
          </>
        )}
      </div>
    </AnimatedCard>
  );
};

export default ActivityPanel;
