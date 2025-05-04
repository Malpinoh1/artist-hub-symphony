
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Bookmark, Calendar, FileText } from 'lucide-react';
import StatsCards from '../components/earnings/StatsCards';
import WithdrawalPanel from '../components/earnings/WithdrawalPanel';
import ActivityPanel from '../components/earnings/ActivityPanel';
import LoadingState from '../components/earnings/LoadingState';

// Define types to avoid circular dependencies
export interface EarningsSummary {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  recentEarnings: any[];
  withdrawals: any[];
}

const Earnings = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for earnings
  const earningsSummary: EarningsSummary = {
    totalEarnings: 5280,
    availableBalance: 3640,
    pendingEarnings: 1640,
    recentEarnings: [
      {
        id: 'e1',
        amount: 320,
        date: '2023-05-01',
        status: 'completed',
        source: 'Spotify Streams'
      },
      {
        id: 'e2',
        amount: 450,
        date: '2023-05-05',
        status: 'completed',
        source: 'Apple Music'
      },
      {
        id: 'e3',
        amount: 280,
        date: '2023-05-12',
        status: 'pending',
        source: 'Boomplay'
      },
      {
        id: 'e4',
        amount: 590,
        date: '2023-05-18',
        status: 'completed',
        source: 'YouTube Music'
      },
      {
        id: 'e5',
        amount: 780,
        date: '2023-05-25',
        status: 'pending',
        source: 'Audiomack'
      }
    ],
    withdrawals: [
      {
        id: 'w1',
        amount: 1500,
        date: '2023-04-15',
        status: 'completed'
      },
      {
        id: 'w2',
        amount: 2200,
        date: '2023-03-10',
        status: 'completed'
      },
      {
        id: 'w3',
        amount: 1000,
        date: '2023-05-20',
        status: 'processing'
      }
    ]
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="container p-4 mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Earnings & Payments</h1>
        <p className="text-slate-500">Manage your earnings and payment methods</p>
      </div>

      <StatsCards 
        totalEarnings={earningsSummary.totalEarnings} 
        availableBalance={earningsSummary.availableBalance} 
        pendingEarnings={earningsSummary.pendingEarnings}
        currencySymbol="$"
      />

      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-lg font-medium mb-4">Recent Earnings</h2>
                <ActivityPanel 
                  recentEarnings={earningsSummary.recentEarnings} 
                  withdrawals={earningsSummary.withdrawals} 
                  type="earnings"
                  currencySymbol="$"
                />
              </Card>
              <Card className="p-6">
                <h2 className="text-lg font-medium mb-4">Recent Withdrawals</h2>
                <ActivityPanel 
                  recentEarnings={earningsSummary.recentEarnings} 
                  withdrawals={earningsSummary.withdrawals} 
                  type="withdrawals"
                  currencySymbol="$"
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <ActivityPanel 
                recentEarnings={earningsSummary.recentEarnings} 
                withdrawals={earningsSummary.withdrawals}
                type="all"
                currencySymbol="$"
              />
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <WithdrawalPanel 
              availableBalance={earningsSummary.availableBalance} 
              minWithdrawal={50}
              currencySymbol="$"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Earnings;
