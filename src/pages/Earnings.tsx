
import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, Download, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import WithdrawalForm from '../components/WithdrawalForm';

// Define interfaces for type safety
interface EarningData {
  id: string;
  amount: number;
  date: string;
  status: string;
  source?: string;
}

interface WithdrawalData {
  id: string;
  amount: number;
  created_at: string;
  processed_at: string | null;
  status: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
}

interface StatsData {
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
}

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'Paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'REJECTED':
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'PENDING':
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-semibold text-slate-900 mb-6">Earnings & Payments</h1>
          <p className="text-slate-600 mb-8">Track your music revenue and manage withdrawals</p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <AnimatedCard>
              <div className="glass-card p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-slate-500">Total Earnings</h2>
                    <p className="text-2xl font-semibold">₦{stats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Lifetime earnings from all streams</div>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={100}>
              <div className="glass-card p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-slate-500">Pending Earnings</h2>
                    <p className="text-2xl font-semibold">₦{stats.pendingEarnings.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Earnings being processed</div>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={200}>
              <div className="glass-card p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-slate-500">Available Balance</h2>
                    <p className="text-2xl font-semibold">₦{stats.availableBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Amount available for withdrawal</div>
              </div>
            </AnimatedCard>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Withdrawal Form */}
            <AnimatedCard className="lg:col-span-1">
              {artistId && userId && (
                <WithdrawalForm 
                  availableBalance={stats.availableBalance}
                  userId={userId}
                  artistId={artistId} 
                  onSuccess={handleWithdrawalSuccess}
                />
              )}
              
              <div className="mt-6 glass-panel p-6">
                <h3 className="text-xl font-semibold mb-4">Payment Information</h3>
                <p className="text-slate-600 mb-4">
                  Once your withdrawal request is approved, you'll receive payment to the bank account you provide.
                  Processing typically takes 1-3 business days.
                </p>
                <div className="text-sm text-slate-500 space-y-2">
                  <div className="flex items-start">
                    <div className="mr-2">•</div>
                    <div>Minimum withdrawal amount: ₦5,000</div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-2">•</div>
                    <div>Bank transfers available to all Nigerian banks</div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-2">•</div>
                    <div>International withdrawals require additional verification</div>
                  </div>
                </div>
              </div>
            </AnimatedCard>
            
            {/* Recent Activity */}
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
                
                <div className="space-y-1 mb-4">
                  <h4 className="font-medium text-slate-700">Withdrawals</h4>
                </div>
                
                {withdrawals.length > 0 ? (
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Date</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Amount</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Account</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.slice(0, 5).map((withdrawal) => (
                          <tr key={withdrawal.id} className="border-b border-slate-100">
                            <td className="px-2 py-3 whitespace-nowrap">
                              {new Date(withdrawal.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap font-medium">
                              ₦{withdrawal.amount.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              {withdrawal.account_name}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              {getStatusBadge(withdrawal.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mb-8 text-center py-8 text-slate-500">
                    No withdrawal requests found
                  </div>
                )}
                
                <div className="space-y-1 mb-4">
                  <h4 className="font-medium text-slate-700">Earnings</h4>
                </div>
                
                {earnings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Date</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Source</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Amount</th>
                          <th className="px-2 py-3 text-left font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.slice(0, 5).map((earning) => (
                          <tr key={earning.id} className="border-b border-slate-100">
                            <td className="px-2 py-3 whitespace-nowrap">
                              {new Date(earning.date).toLocaleDateString()}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              {earning.source || 'Platform Earnings'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap font-medium">
                              ₦{earning.amount.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              {getStatusBadge(earning.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No earnings recorded yet
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Earnings;
