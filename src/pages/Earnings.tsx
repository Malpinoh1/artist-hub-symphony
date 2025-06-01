
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Bookmark, Calendar, FileText, RefreshCw } from 'lucide-react';
import StatsCards from '../components/earnings/StatsCards';
import WithdrawalPanel from '../components/earnings/WithdrawalPanel';
import ActivityPanel from '../components/earnings/ActivityPanel';
import LoadingState from '../components/earnings/LoadingState';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

// Define types to avoid circular dependencies
export interface EarningsSummary {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  recentEarnings: any[];
  withdrawals: any[];
}

const Earnings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [artistData, setArtistData] = useState<any>(null);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingEarnings: 0,
    recentEarnings: [],
    withdrawals: []
  });

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in");
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;
      
      // Get user's profile information
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Get artist data
      const { data: artistInfo } = await supabase
        .from('artists')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (artistInfo) {
        setArtistData(artistInfo);
        
        // Get earnings data
        const { data: earningsData } = await supabase
          .from('earnings')
          .select('*')
          .eq('artist_id', artistInfo.id)
          .order('date', { ascending: false });

        // Get withdrawals data
        const { data: withdrawalsData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('artist_id', artistInfo.id)
          .order('created_at', { ascending: false });

        // Calculate earnings summary
        const totalEarnings = artistInfo.total_earnings || 0;
        const availableBalance = artistInfo.available_balance || 0;
        const pendingEarnings = earningsData?.filter(e => e.status === 'Pending')?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        setEarningsSummary({
          totalEarnings,
          availableBalance,
          pendingEarnings,
          recentEarnings: earningsData || [],
          withdrawals: withdrawalsData || []
        });
      } else {
        // Use default values if no artist data found
        setEarningsSummary({
          totalEarnings: 0,
          availableBalance: 0,
          pendingEarnings: 0,
          recentEarnings: [],
          withdrawals: []
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading earnings data:", error);
      toast({
        title: "Failed to load earnings",
        description: "There was an error fetching earnings data.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleWithdrawalSuccess = () => {
    toast({
      title: "Withdrawal requested",
      description: "Your withdrawal request has been submitted successfully."
    });
    // Refresh earnings data
    fetchEarningsData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <LoadingState />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container p-4 mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold dark:text-white">Earnings & Payments</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage your earnings and payment methods</p>
          </div>

          <StatsCards 
            stats={{
              totalEarnings: earningsSummary.totalEarnings,
              availableBalance: earningsSummary.availableBalance,
              pendingEarnings: earningsSummary.pendingEarnings
            }}
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
                    <h2 className="text-lg font-medium mb-4 dark:text-white">Recent Earnings</h2>
                    <ActivityPanel 
                      earnings={earningsSummary.recentEarnings} 
                      withdrawals={[]}
                    />
                  </Card>
                  <Card className="p-6">
                    <h2 className="text-lg font-medium mb-4 dark:text-white">Recent Withdrawals</h2>
                    <ActivityPanel 
                      earnings={[]}
                      withdrawals={earningsSummary.withdrawals} 
                    />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <ActivityPanel 
                    earnings={earningsSummary.recentEarnings}
                    withdrawals={earningsSummary.withdrawals}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="withdraw">
                <WithdrawalPanel 
                  availableBalance={earningsSummary.availableBalance}
                  userId={userProfile?.id || ""}
                  artistId={artistData?.id || ""}
                  onSuccess={handleWithdrawalSuccess}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Earnings;
