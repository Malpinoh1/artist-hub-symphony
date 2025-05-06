
import React from 'react';
import { Check, X, DollarSign } from 'lucide-react';
import { updateWithdrawalStatus } from '@/services/adminService';
import { toast } from 'sonner';

interface WithdrawalsTabProps {
  withdrawals: any[];
  loading: boolean;
  onWithdrawalUpdate: (id: string, status: string) => void;
}

const WithdrawalsTab: React.FC<WithdrawalsTabProps> = ({ withdrawals, loading, onWithdrawalUpdate }) => {
  const handleWithdrawalAction = async (id: string, status: string) => {
    const result = await updateWithdrawalStatus(id, status);
    if (result.success) {
      onWithdrawalUpdate(id, status);
      toast({
        title: 'Status updated',
        description: `Withdrawal status changed to ${status}`,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Update failed',
        description: 'Could not update withdrawal status',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading withdrawals...</div>;
  }

  if (withdrawals.length === 0) {
    return (
      <div className="py-12 text-center">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-xl font-semibold text-gray-900">No withdrawal requests</h3>
        <p className="text-gray-500">There are no withdrawal requests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3">Artist</th>
            <th scope="col" className="px-4 py-3">Amount</th>
            <th scope="col" className="px-4 py-3">Account Info</th>
            <th scope="col" className="px-4 py-3">Bank</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((withdrawal) => (
            <tr key={withdrawal.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-4 py-4 font-medium text-gray-900">
                {withdrawal.artists?.name || "Unknown Artist"}
              </td>
              <td className="px-4 py-4">
                ₦{withdrawal.amount.toLocaleString()}
              </td>
              <td className="px-4 py-4">
                <p className="font-medium">{withdrawal.account_name}</p>
                <p className="text-xs text-gray-500">{withdrawal.account_number}</p>
              </td>
              <td className="px-4 py-4">
                {withdrawal.bank_name || "Not specified"}
              </td>
              <td className="px-4 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  withdrawal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  withdrawal.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {withdrawal.status}
                </span>
              </td>
              <td className="px-4 py-4">
                {new Date(withdrawal.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-4">
                <div className="flex space-x-2">
                  {withdrawal.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleWithdrawalAction(withdrawal.id, 'COMPLETED')}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleWithdrawalAction(withdrawal.id, 'REJECTED')}
                        className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WithdrawalsTab;
