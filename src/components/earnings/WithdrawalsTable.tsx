
import React from 'react';
import StatusBadge from './StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface WithdrawalData {
  id: string;
  amount: number;
  created_at: string;
  processed_at: string | null;
  status: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
}

interface WithdrawalsTableProps {
  withdrawals: WithdrawalData[];
}

const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({ withdrawals }) => {
  if (withdrawals.length === 0) {
    return (
      <div className="mb-8 text-center py-8 text-slate-500">
        No withdrawal requests found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mb-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.slice(0, 5).map((withdrawal) => (
            <TableRow key={withdrawal.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(withdrawal.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="whitespace-nowrap font-medium">
                ${withdrawal.amount.toLocaleString()}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {withdrawal.account_name}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <StatusBadge status={withdrawal.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WithdrawalsTable;
