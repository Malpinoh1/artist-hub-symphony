
import React, { useState, useEffect } from 'react';
import { DollarSign, Download, ArrowUpRight, ChevronDown, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';

// Interface for earnings transactions
interface Transaction {
  id: string;
  date: string;
  source: string;
  amount: number;
  status: 'Pending' | 'Processed' | 'Failed';
}

// Interface for withdrawal history
interface Withdrawal {
  id: string;
  date: string;
  amount: number;
  status: 'Pending' | 'Processed' | 'Failed';
}

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState({
    total: 0,
    available: 0,
    pending: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
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
        
        // Get artist financial data
        const { data: artistData, error: artistError } = await supabase
          .from('artists')
          .select('total_earnings, available_balance')
          .eq('id', userId)
          .maybeSingle();

        if (artistError) {
          console.error("Error fetching artist data:", artistError);
        } else if (artistData) {
          setBalanceData({
            total: artistData.total_earnings || 0,
            available: artistData.available_balance || 0,
            pending: (artistData.total_earnings || 0) - (artistData.available_balance || 0)
          });
        }
        
        // Get earnings transactions
        const { data: earningsData, error: earningsError } = await supabase
          .from('earnings')
          .select('*')
          .eq('artist_id', userId)
          .order('date', { ascending: false });
          
        if (earningsError) {
          console.error("Error fetching earnings:", earningsError);
        } else if (earningsData) {
          const formattedTransactions = earningsData.map(earning => ({
            id: earning.id,
            date: new Date(earning.date).toLocaleDateString(),
            source: 'Streaming Revenue',
            amount: earning.amount,
            status: earning.status
          }));
          
          setTransactions(formattedTransactions);
        }
        
        // Get withdrawal history
        const { data: withdrawalData, error: withdrawalError } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('artist_id', userId)
          .order('created_at', { ascending: false });
          
        if (withdrawalError) {
          console.error("Error fetching withdrawals:", withdrawalError);
        } else if (withdrawalData) {
          const formattedWithdrawals = withdrawalData.map(withdrawal => ({
            id: withdrawal.id,
            date: new Date(withdrawal.created_at).toLocaleDateString(),
            amount: withdrawal.amount,
            status: withdrawal.status === 'PENDING' ? 'Pending' : (withdrawal.status === 'COMPLETED' ? 'Processed' : 'Failed')
          }));
          
          setWithdrawals(formattedWithdrawals);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading earnings data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleWithdrawalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in");
        return;
      }
      
      const userId = session.user.id;
      const amount = Number(formData.get('amount'));
      const accountName = formData.get('accountName') as string;
      const accountNumber = formData.get('accountNumber') as string;
      
      // Create withdrawal request
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: userId,
          artist_id: userId,
          amount: amount,
          account_name: accountName,
          account_number: accountNumber,
          status: 'PENDING'
        })
        .select();
        
      if (error) {
        console.error("Error creating withdrawal request:", error);
        alert("Failed to submit withdrawal request.");
      } else {
        alert("Withdrawal request submitted successfully!");
        // Reload the page to show the new withdrawal
        window.location.reload();
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("An error occurred while processing your withdrawal request.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900">Earnings</h1>
              <p className="text-slate-600">Track your earnings and manage withdrawals</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Withdraw Earnings</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4 pt-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
                      Amount (USD)
                    </label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      min="10"
                      max={balanceData.available}
                      required
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Available balance: ${balanceData.available.toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="accountName" className="block text-sm font-medium text-slate-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      id="accountName"
                      name="accountName"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      id="accountNumber"
                      name="accountNumber"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <DialogTrigger asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Submit Request
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            <AnimatedCard>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <h3 className="text-2xl font-display font-semibold text-slate-900">
                    ${balanceData.total.toFixed(2)}
                  </h3>
                )}
                <p className="text-sm text-slate-500 mt-1">Total Earnings</p>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={50}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <h3 className="text-2xl font-display font-semibold text-slate-900">
                    ${balanceData.available.toFixed(2)}
                  </h3>
                )}
                <p className="text-sm text-slate-500 mt-1">Available Balance</p>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={100}>
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <h3 className="text-2xl font-display font-semibold text-slate-900">
                    ${balanceData.pending.toFixed(2)}
                  </h3>
                )}
                <p className="text-sm text-slate-500 mt-1">Pending Earnings</p>
              </div>
            </AnimatedCard>
          </div>
          
          {/* Transactions Table */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Recent Transactions</h2>
          <AnimatedCard delay={150} className="mb-10">
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Source</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto animate-pulse"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : transactions.length > 0 ? (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-slate-100">
                          <td className="px-6 py-4 text-slate-700">{transaction.date}</td>
                          <td className="px-6 py-4 text-slate-700">{transaction.source}</td>
                          <td className="px-6 py-4 text-right text-slate-700">${transaction.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'Processed' ? 'bg-green-100 text-green-800' : 
                              transaction.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          No transactions to display.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedCard>
          
          {/* Withdrawals Table */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Withdrawal History</h2>
          <AnimatedCard delay={200}>
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Date</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array(2).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto animate-pulse"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : withdrawals.length > 0 ? (
                      withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="border-b border-slate-100">
                          <td className="px-6 py-4 text-slate-700">{withdrawal.date}</td>
                          <td className="px-6 py-4 text-right text-slate-700">${withdrawal.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              withdrawal.status === 'Processed' ? 'bg-green-100 text-green-800' : 
                              withdrawal.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {withdrawal.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                          No withdrawals to display.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedCard>
          
          {/* Download Reports Card */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mt-10 mb-4">Reports</h2>
          <AnimatedCard delay={250}>
            <div className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Download Financial Reports</h3>
                <p className="text-slate-600">Access your complete financial data for tax and accounting purposes.</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Earnings;
