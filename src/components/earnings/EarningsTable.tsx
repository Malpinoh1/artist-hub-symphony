
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

export interface EarningData {
  id: string;
  amount: number;
  date: string;
  status: string;
  source?: string;
}

interface EarningsTableProps {
  earnings: EarningData[];
}

const EarningsTable: React.FC<EarningsTableProps> = ({ earnings }) => {
  if (earnings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No earnings recorded yet
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="block sm:hidden space-y-2">
        {earnings.slice(0, 5).map((earning) => (
          <div key={earning.id} className="border rounded-lg p-3 bg-card">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{new Date(earning.date).toLocaleDateString()}</p>
                <p className="text-sm truncate">{earning.source || 'Platform Earnings'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">${earning.amount.toLocaleString()}</p>
                <StatusBadge status={earning.status} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earnings.slice(0, 5).map((earning) => (
              <TableRow key={earning.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(earning.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {earning.source || 'Platform Earnings'}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  ${earning.amount.toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusBadge status={earning.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default EarningsTable;
