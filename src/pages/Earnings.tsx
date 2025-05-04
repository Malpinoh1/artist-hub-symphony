
import React, { useState, useEffect } from 'react';
import { BarChart3, Download, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';

// Define proper types to match our backend schema
type Transaction = {
  id: string;
  date: string;
  source: string;
  amount: number;
  status: "Pending" | "Processed" | "Failed"; // Fixed to match expected enum
};

type Withdrawal = {
  id: string;
  date: string;
  amount: number;
  status: "Pending" | "Processed" | "Failed"; // Fixed to match expected enum
};

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log("No user logged in");
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        
        // Get artist data
        const { data: artistData } = await supabase
          .from('artists')
          .select('total_earnings, available_balance')
          .eq('id', userId)
          .maybeSingle();

        // Fetch earnings for transactions
        const { data: earningsData } = await supabase
          .from('earnings')
          .select('*')
          .eq('artist_id', userId)
          .order('date', { ascending: false });

        // Fetch withdrawals
        const { data: withdrawalsData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Calculate stats
        const totalEarnings = artistData?.total_earnings || 0;
        const availableBalance = artistData?.available_balance || 0;
        
        const pendingPayouts = withdrawalsData
          ? withdrawalsData.filter(w => w.status === 'PENDING')
              .reduce((sum, w) => sum + Number(w.amount), 0)
          : 0;
          
        const completedPayouts = withdrawalsData
          ? withdrawalsData.filter(w => w.status === 'PAID')
              .reduce((sum, w) => sum + Number(w.amount), 0)
          : 0;

        setStats({
          totalEarnings,
          availableBalance,
          pendingPayouts,
          completedPayouts
        });

        // Format transactions with proper types
        if (earningsData) {
          const formattedTransactions: Transaction[] = earningsData.map(earning => ({
            id: earning.id,
            date: new Date(earning.date).toLocaleDateString(),
            source: 'Streaming Revenue',
            amount: Number(earning.amount),
            status: earning.status === 'Paid' ? 'Processed' : 'Pending' // Map DB status to expected enum
          }));
          setTransactions(formattedTransactions);
        }

        // Format withdrawals with proper types
        if (withdrawalsData) {
          const formattedWithdrawals: Withdrawal[] = withdrawalsData.map(withdrawal => ({
            id: withdrawal.id,
            date: new Date(withdrawal.created_at).toLocaleDateString(),
            amount: Number(withdrawal.amount),
            status: withdrawal.status === 'PAID' ? 'Processed' : 
                   withdrawal.status === 'PENDING' ? 'Pending' : 'Failed'
          }));
          setWithdrawals(formattedWithdrawals);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading earnings data:", error);
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-6">Earnings Dashboard</h1>
          <p className="text-slate-600 mb-8">Track your revenue and payouts from all sources.</p>

          {/* Earnings stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            <AnimatedCard delay={100}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-semibold text-slate-900">${stats.totalEarnings.toFixed(2)}</h3>
                <p className="text-sm text-slate-500 mt-1">Total Earnings</p>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={150}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-semibold text-slate-900">${stats.availableBalance.toFixed(2)}</h3>
                <p className="text-sm text-slate-500 mt-1">Available Balance</p>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={200}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <ChevronDown className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-semibold text-slate-900">${stats.pendingPayouts.toFixed(2)}</h3>
                <p className="text-sm text-slate-500 mt-1">Pending Payouts</p>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={250}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Download className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-semibold text-slate-900">${stats.completedPayouts.toFixed(2)}</h3>
                <p className="text-sm text-slate-500 mt-1">Completed Payouts</p>
              </div>
            </AnimatedCard>
          </div>

          {/* Recent Transactions */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Recent Transactions</h2>
          <div className="glass-panel overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Source</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100">
                        <td className="px-6 py-4 text-slate-700">{transaction.date}</td>
                        <td className="px-6 py-4 text-slate-700">{transaction.source}</td>
                        <td className="px-6 py-4 text-slate-700">${transaction.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            transaction.status === 'Processed' 
                              ? 'bg-green-100 text-green-700' 
                              : transaction.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-slate-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Withdrawal History */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Withdrawal History</h2>
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length > 0 ? (
                    withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-slate-100">
                        <td className="px-6 py-4 text-slate-700">{withdrawal.date}</td>
                        <td className="px-6 py-4 text-slate-700">${withdrawal.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            withdrawal.status === 'Processed' 
                              ? 'bg-green-100 text-green-700' 
                              : withdrawal.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {withdrawal.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-slate-500">
                        No withdrawals found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal Form Placeholder */}
          <div className="mt-12">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Request a Withdrawal</h2>
            <div className="glass-panel p-6">
              <p className="text-center text-slate-500 py-8">
                Withdrawal functionality will be available soon.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Earnings;
