
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { Alert, AlertDescription } from './ui/alert';
import { sendWithdrawalNotificationEmail } from '@/utils/email';

const EXCHANGE_RATE = 1250;
const MIN_WITHDRAWAL = 50;
const MAX_WITHDRAWAL = 10000;

interface WithdrawalFormProps {
  availableBalance: number;
  creditBalance?: number;
  userId: string;
  artistId: string;
  onSuccess?: () => void;
}

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ availableBalance, creditBalance = 0, userId, artistId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    accountName: '',
    accountNumber: '',
    bankName: ''
  });

  useEffect(() => {
    const checkPendingWithdrawals = async () => {
      try {
        const { data, error } = await supabase
          .from('withdrawals')
          .select('id')
          .eq('artist_id', artistId)
          .in('status', ['PENDING', 'APPROVED', 'PROCESSING'])
          .limit(1);

        if (error) throw error;
        setHasPendingWithdrawal(data && data.length > 0);
      } catch (error) {
        console.error('Error checking pending withdrawals:', error);
      } finally {
        setCheckingPending(false);
      }
    };

    if (artistId) {
      checkPendingWithdrawals();
    }
  }, [artistId]);

  const nairaAmount = useMemo(() => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return 0;
    return amount * EXCHANGE_RATE;
  }, [formData.amount]);

  // Calculate credit deduction and final payout
  const { creditDeduction, finalAmount, finalNairaAmount } = useMemo(() => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return { creditDeduction: 0, finalAmount: 0, finalNairaAmount: 0 };
    const deduction = Math.min(creditBalance, amount);
    const final_ = amount - deduction;
    return { creditDeduction: deduction, finalAmount: final_, finalNairaAmount: final_ * EXCHANGE_RATE };
  }, [formData.amount, creditBalance]);

  const amountError = useMemo(() => {
    const amount = parseFloat(formData.amount);
    if (!formData.amount) return null;
    if (isNaN(amount)) return 'Please enter a valid amount';
    if (amount < MIN_WITHDRAWAL) return `Minimum withdrawal is $${MIN_WITHDRAWAL}`;
    if (amount > MAX_WITHDRAWAL) return `Maximum withdrawal is $${MAX_WITHDRAWAL.toLocaleString()}`;
    if (amount > availableBalance) return `Insufficient balance. Available: $${availableBalance.toLocaleString()}`;
    return null;
  }, [formData.amount, availableBalance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPendingWithdrawal) {
      toast({ title: 'Pending withdrawal exists', description: 'You cannot request a new withdrawal while one is pending', variant: 'destructive' });
      return;
    }

    if (!formData.amount || !formData.accountName || !formData.accountNumber || !formData.bankName) {
      toast({ title: 'Missing information', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL || amount > availableBalance) {
      toast({ title: 'Invalid amount', description: amountError || 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);

      const calculatedNairaAmount = amount * EXCHANGE_RATE;
      const deduction = Math.min(creditBalance, amount);
      const payout = amount - deduction;

      // 1. Verify sufficient balance (but don't deduct yet — deduction happens on admin approval)
      const { data: artistData, error: fetchError } = await supabase
        .from('artists')
        .select('available_balance, credit_balance')
        .eq('id', artistId)
        .single();

      if (fetchError) throw fetchError;

      const currentBalance = artistData?.available_balance || 0;
      if (currentBalance < amount) {
        toast({ title: 'Insufficient balance', description: 'Your available balance is not enough for this withdrawal.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // 2. Insert withdrawal request (balance will be deducted when admin approves)
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: userId,
          artist_id: artistId,
          amount: amount,
          naira_amount: calculatedNairaAmount,
          credit_deduction: deduction,
          final_amount: payout,
          status: 'PENDING',
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          bank_name: formData.bankName
        });

      if (error) throw error;

      // 3. Credit deduction will happen when admin approves

      // 4. Log activity
      await supabase.from('activity_logs').insert({
        artist_id: artistId,
        user_id: userId,
        activity_type: 'withdrawal_requested',
        title: 'Withdrawal Requested',
        description: `Requested withdrawal of $${amount.toLocaleString()} (₦${calculatedNairaAmount.toLocaleString()})${deduction > 0 ? ` — $${deduction.toLocaleString()} credit deducted, payout: $${payout.toLocaleString()}` : ''}`,
        metadata: { amount, naira_amount: calculatedNairaAmount, credit_deduction: deduction, final_amount: payout }
      });

      // 5. Send notification
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email) {
        await sendWithdrawalNotificationEmail(userData.user.email, 'requested', amount, calculatedNairaAmount);
      }

      setFormData({ amount: '', accountName: '', accountNumber: '', bankName: '' });
      setHasPendingWithdrawal(true);

      toast({ title: 'Request submitted', description: 'Your withdrawal request has been submitted and balance deducted.' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting withdrawal request:", error);
      toast({ title: 'Request failed', description: 'Could not submit your withdrawal request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingPending) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (hasPendingWithdrawal) {
    return (
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-2">Request Withdrawal</h3>
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have a pending withdrawal request. You cannot submit a new request until the current one is completed or rejected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <h3 className="text-xl font-semibold mb-2">Request Withdrawal</h3>
      <p className="text-muted-foreground mb-4">Available Balance: ${availableBalance.toLocaleString()}</p>

      {/* Credit Balance Warning */}
      {creditBalance > 0 && (
        <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            You have an outstanding credit/subscription balance of <strong>${creditBalance.toLocaleString()}</strong>. This will be deducted from your withdrawal.
          </AlertDescription>
        </Alert>
      )}

      {/* Exchange Rate Info */}
      <div className="bg-muted/50 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Exchange Rate: $1 = ₦{EXCHANGE_RATE.toLocaleString()}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Min: ${MIN_WITHDRAWAL} | Max: ${MAX_WITHDRAWAL.toLocaleString()}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Amount (USD)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-background ${amountError ? 'border-destructive' : 'border-input'}`}
            placeholder="Enter amount to withdraw"
            min={MIN_WITHDRAWAL}
            max={Math.min(MAX_WITHDRAWAL, availableBalance)}
            step="0.01"
          />
          {amountError && (
            <p className="text-sm text-destructive mt-1">{amountError}</p>
          )}
          {/* Breakdown Display */}
          {nairaAmount > 0 && !amountError && (
            <div className="mt-2 p-3 bg-primary/10 rounded-md space-y-1">
              <p className="text-sm text-muted-foreground">
                Withdrawal: <strong>${parseFloat(formData.amount).toLocaleString()}</strong>
              </p>
              {creditDeduction > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Credit Deduction: <strong>-${creditDeduction.toLocaleString()}</strong>
                </p>
              )}
              <p className="text-sm font-medium text-primary">
                You will receive: <strong>${finalAmount.toLocaleString()}</strong> (₦{finalNairaAmount.toLocaleString()})
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Name</label>
          <input type="text" name="accountName" value={formData.accountName} onChange={handleChange}
            className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-background" placeholder="Enter account name" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Number</label>
          <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange}
            className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-background" placeholder="Enter account number" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bank Name</label>
          <input type="text" name="bankName" value={formData.bankName} onChange={handleChange}
            className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-background" placeholder="Enter bank name" />
        </div>

        <button type="submit" disabled={loading || !!amountError}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Submit Withdrawal Request'}
        </button>
      </form>
    </div>
  );
};

export default WithdrawalForm;
