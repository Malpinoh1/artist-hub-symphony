
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Artist } from '@/services/adminService';

interface ArtistsEarningsTabProps {
  artistsEarnings: Artist[];
  loading: boolean;
}

const ArtistsEarningsTab: React.FC<ArtistsEarningsTabProps> = ({ artistsEarnings, loading }) => {
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Wallet Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artistsEarnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No earnings data available
                  </TableCell>
                </TableRow>
              ) : (
                artistsEarnings.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell>{artist.email}</TableCell>
                    <TableCell>{formatCurrency(artist.total_earnings)}</TableCell>
                    <TableCell>{formatCurrency(artist.available_balance)}</TableCell>
                    <TableCell>{formatCurrency(artist.wallet_balance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ArtistsEarningsTab;
