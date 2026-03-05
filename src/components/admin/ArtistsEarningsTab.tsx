
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { Artist } from '@/services/adminService';
import ArtistEarningsEditor from './ArtistEarningsEditor';

interface ArtistsEarningsTabProps {
  artistsEarnings: Artist[];
  loading: boolean;
  onArtistUpdate?: () => void;
}

const ArtistsEarningsTab: React.FC<ArtistsEarningsTabProps> = ({ 
  artistsEarnings, 
  loading,
  onArtistUpdate = () => {} 
}) => {
  const [selectedArtist, setSelectedArtist] = React.useState<Artist | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleOpenEditor = (artist: Artist) => {
    setSelectedArtist(artist);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedArtist(null);
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : artistsEarnings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No earnings data available</div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {artistsEarnings.map((artist) => (
              <div key={artist.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{artist.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{artist.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditor(artist)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="font-semibold text-xs">{formatCurrency(artist.total_earnings)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Available</p>
                    <p className="font-semibold text-xs">{formatCurrency(artist.available_balance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Wallet</p>
                    <p className="font-semibold text-xs">{formatCurrency(artist.wallet_balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Available Balance</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artistsEarnings.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell>{artist.email}</TableCell>
                    <TableCell>{formatCurrency(artist.total_earnings)}</TableCell>
                    <TableCell>{formatCurrency(artist.available_balance)}</TableCell>
                    <TableCell>{formatCurrency(artist.wallet_balance)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditor(artist)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {selectedArtist && (
        <ArtistEarningsEditor
          artist={selectedArtist}
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onUpdate={onArtistUpdate}
        />
      )}
    </div>
  );
};

export default ArtistsEarningsTab;
