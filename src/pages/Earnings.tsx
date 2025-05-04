
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../integrations/supabase/client';

// Import refactored components
import LoadingState from '../components/earnings/LoadingState';
import StatsCards, { StatsData } from '../components/earnings/StatsCards';
import WithdrawalPanel from '../components/earnings/WithdrawalPanel';
import ActivityPanel from '../components/earnings/ActivityPanel';
import { EarningData } from '../components/earnings/EarningsTable';
import { WithdrawalData } from '../components/earnings/WithdrawalsTable';

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningData[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalEarnings: 0,
    pendingEarnings: 0,
    availableBalance: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log("No user logged in");
          setLoading(false);
          return;
        }

        const currentUserId = session.user.id;
        setUserId(currentUserId);
        
        // Get artist ID
        const { data: artistData } = await supabase
          .from('artists')
          .select('id, available_balance, total_earnings')
          .eq('user_id', currentUserId)
          .maybeSingle();
          
        if (artistData) {
          setArtistId(artistData.id);
          setStats(prevStats => ({
            ...prevStats,
            totalEarnings: artistData.total_earnings || 0,
            availableBalance: artistData.available_balance || 0
          }));
          
          // Fetch earnings
          const { data: earningsData, error: earningsError } = await supabase
            .from('earnings')
            .select('*')
            .eq('artist_id', artistData.id)
            .order('created_at', { ascending: false });
            
          if (!earningsError && earningsData) {
            setEarnings(earningsData);
            // Calculate pending earnings
            const pendingAmount = earningsData
              .filter(earning => earning.status === 'Pending')
              .reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
            
            setStats(prevStats => ({
              ...prevStats,
              pendingEarnings: pendingAmount
            }));
          }
          
          // Fetch withdrawals
          const { data: withdrawalsData, error: withdrawalsError } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('artist_id', artistData.id)
            .order('created_at', { ascending: false });
            
          if (!withdrawalsError && withdrawalsData) {
            setWithdrawals(withdrawalsData);
          }
        }
      } catch (error) {
        console.error("Error loading earnings data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleWithdrawalSuccess = () => {
    // Refresh data after successful withdrawal request
    window.location.reload();
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-semibold text-slate-900 mb-6">Earnings & Payments</h1>
          <p className="text-slate-600 mb-8">Track your music revenue and manage withdrawals</p>
          
          {/* Stats Cards */}
          <StatsCards stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Withdrawal Form */}
            {artistId && userId && (
              <WithdrawalPanel
                availableBalance={stats.availableBalance}
                userId={userId}
                artistId={artistId}
                onSuccess={handleWithdrawalSuccess}
              />
            )}
            
            {/* Recent Activity */}
            <ActivityPanel earnings={earnings} withdrawals={withdrawals} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Earnings;
