
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark, Calendar, FileText } from 'lucide-react';
import StatsCards from '../components/earnings/StatsCards';
import WithdrawalPanel from '../components/earnings/WithdrawalPanel';
import ActivityPanel from '../components/earnings/ActivityPanel';
import LoadingState from '../components/earnings/LoadingState';
import RoyaltyStatementsSection from '../components/earnings/RoyaltyStatementsSection';
import { useToast } from '../hooks/use-toast';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import { useAuth } from '../contexts/AuthContext';
import { useEarningsData } from '../hooks/useEarningsData';
import { useUserProfile } from '../hooks/useUserProfile';
import SubscriptionGate from '../components/SubscriptionGate';

const EarningsContent = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getEffectiveAccountId, canManage, isWebsiteAdmin } = useTeamPermissions();
  const [activeTab, setActiveTab] = useState("overview");

  const effectiveAccountId = getEffectiveAccountId() || user?.id;
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: earningsSummary, isLoading, refetch } = useEarningsData(effectiveAccountId);

  const summary = earningsSummary || {
    totalEarnings: 0,
    availableBalance: 0,
    pendingEarnings: 0,
    creditBalance: 0,
    recentEarnings: [],
    withdrawals: [],
  };

  const handleWithdrawalSuccess = () => {
    toast({
      title: "Withdrawal requested",
      description: "Your withdrawal request has been submitted successfully."
    });
    refetch();
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="container px-3 sm:p-4 mx-auto max-w-7xl">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold dark:text-white">Earnings & Payments</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Manage your earnings and payment methods</p>
          </div>

          <StatsCards 
            stats={{
              totalEarnings: summary.totalEarnings,
              availableBalance: summary.availableBalance,
              pendingEarnings: summary.pendingEarnings,
              creditBalance: summary.creditBalance
            }}
          />

          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 sm:mb-8 flex-wrap h-auto gap-1">
                <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Overview</span>
                  <span className="xs:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="statements" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  Statements
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                  Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-medium mb-4 dark:text-white">Recent Earnings</h2>
                    <ActivityPanel 
                      earnings={summary.recentEarnings} 
                      withdrawals={[]}
                      artistId={effectiveAccountId}
                    />
                  </Card>
                  <Card className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-medium mb-4 dark:text-white">Recent Withdrawals</h2>
                    <ActivityPanel 
                      earnings={[]}
                      withdrawals={summary.withdrawals} 
                      artistId={effectiveAccountId}
                    />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card className="p-4 sm:p-6">
                  <ActivityPanel 
                    earnings={summary.recentEarnings}
                    withdrawals={summary.withdrawals}
                    artistId={effectiveAccountId}
                    showActivityLog={true}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="statements">
                {effectiveAccountId ? (
                  <RoyaltyStatementsSection artistId={effectiveAccountId} />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">
                        You need to have an artist profile to view royalty statements.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="withdraw">
                <WithdrawalPanel 
                  availableBalance={summary.availableBalance}
                  creditBalance={summary.creditBalance}
                  userId={user?.id || ""}
                  artistId={effectiveAccountId || ""}
                  onSuccess={handleWithdrawalSuccess}
                />
              </TabsContent>
            </Tabs>
          </div>
    </div>
  );
};

const Earnings = () => {
  return (
    <SubscriptionGate fallbackMessage="You need an active subscription to access earnings.">
      <EarningsContent />
    </SubscriptionGate>
  );
};

export default Earnings;
