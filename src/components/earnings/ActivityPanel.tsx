import React, { useEffect, useState } from 'react';
import { Download, Calendar, Activity, RefreshCw } from 'lucide-react';
import AnimatedCard from '../AnimatedCard';
import EarningsTable, { EarningData } from './EarningsTable';
import WithdrawalsTable, { WithdrawalData } from './WithdrawalsTable';
import { 
  ActivityLog, 
  fetchActivityLogs, 
  subscribeToActivityLogs,
  getActivityIcon,
  getActivityColor 
} from '@/services/activityLogService';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityPanelProps {
  earnings: EarningData[];
  withdrawals: WithdrawalData[];
  artistId?: string;
  showActivityLog?: boolean;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ 
  earnings, 
  withdrawals, 
  artistId,
  showActivityLog = false 
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (artistId && showActivityLog) {
      loadActivities();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToActivityLogs(artistId, (newLog) => {
        setActivities(prev => [newLog, ...prev].slice(0, 20));
      });

      return unsubscribe;
    }
  }, [artistId, showActivityLog]);

  const loadActivities = async () => {
    if (!artistId) return;
    setLoading(true);
    const logs = await fetchActivityLogs(artistId, 20);
    setActivities(logs);
    setLoading(false);
  };

  return (
    <AnimatedCard className="lg:col-span-2" delay={100}>
      <div className="glass-panel p-4 sm:p-6 h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h3 className="text-lg sm:text-xl font-semibold">Recent Activity</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none text-xs p-2 rounded bg-muted hover:bg-muted/80 flex items-center justify-center gap-1 transition-colors">
              <Download className="w-3 h-3" />
              <span className="hidden xs:inline">Export</span>
            </button>
            <button className="flex-1 sm:flex-none text-xs p-2 rounded bg-muted hover:bg-muted/80 flex items-center justify-center gap-1 transition-colors">
              <Calendar className="w-3 h-3" />
              <span className="hidden xs:inline">Filter</span>
            </button>
          </div>
        </div>
        
        {/* Activity Log Section */}
        {showActivityLog && artistId && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">Activity Log</h4>
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            
            {activities.length > 0 ? (
              <ScrollArea className="h-[200px] sm:h-[250px]">
                <div className="space-y-2 pr-4">
                  {activities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${getActivityColor(activity.activity_type)}`}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Activity className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        )}
        
        {withdrawals.length > 0 && (
          <>
            <div className="space-y-1 mb-3 sm:mb-4">
              <h4 className="font-medium text-foreground">Withdrawals</h4>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full px-4 sm:px-0">
                <WithdrawalsTable withdrawals={withdrawals} />
              </div>
            </div>
          </>
        )}
        
        {earnings.length > 0 && (
          <>
            <div className="space-y-1 mb-3 sm:mb-4 mt-4 sm:mt-6">
              <h4 className="font-medium text-foreground">Earnings</h4>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full px-4 sm:px-0">
                <EarningsTable earnings={earnings} />
              </div>
            </div>
          </>
        )}

        {!showActivityLog && withdrawals.length === 0 && earnings.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No recent activity to display</p>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
};

export default ActivityPanel;
