
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface WithdrawalFormProps {
  availableBalance: number;
  userId: string;
  artistId: string;
  onSuccess?: () => void;
}

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ availableBalance, userId, artistId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    accountName: '',
    accountNumber: '',
    bankName: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.amount || !formData.accountName || !formData.accountNumber || !formData.bankName) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }
    
    const amount = parseFloat(formData.amount);
    
    // Check if amount is valid and within available balance
    if (isNaN(amount) || amount <= 0 || amount > availableBalance) {
      toast({
        title: 'Invalid amount',
        description: `Amount must be between 1 and ${availableBalance}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Insert withdrawal request
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: userId,
          artist_id: artistId,
          amount: amount,
          status: 'PENDING',
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          bank_name: formData.bankName
        });
        
      if (error) throw error;
      
      // Reset form
      setFormData({
        amount: '',
        accountName: '',
        accountNumber: '',
        bankName: ''
      });
      
      toast({
        title: 'Request submitted',
        description: 'Your withdrawal request has been submitted successfully',
      });
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Error submitting withdrawal request:", error);
      toast({
        title: 'Request failed',
        description: 'Could not submit your withdrawal request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <h3 className="text-xl font-semibold mb-2">Request Withdrawal</h3>
      <p className="text-slate-500 mb-6">Available Balance: ₦{availableBalance.toLocaleString()}</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter amount to withdraw"
            min="1"
            max={availableBalance}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter account name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter account number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bank name"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Submit Withdrawal Request'}
        </button>
      </form>
    </div>
  );
};

export default WithdrawalForm;
