
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Artist, updateArtistStatus } from '@/services/adminService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ArtistsTabProps {
  artists: Artist[];
  loading: boolean;
  onArtistUpdate: (id: string, status: string, updatedData?: any) => void;
}

const ArtistsTab: React.FC<ArtistsTabProps> = ({
  artists,
  loading,
  onArtistUpdate
}) => {
  const handleStatusChange = async (artistId: string, newStatus: string) => {
    try {
      const result = await updateArtistStatus(artistId, newStatus);
      if (result.success && result.data) {
        toast.success(`Artist status updated to ${newStatus}`);
        onArtistUpdate(artistId, newStatus, result.data);
      } else {
        toast.error(`Failed to update: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating artist status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Artists Management</h3>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Total: {artists.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No artists found.</div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {artists.map((artist) => {
              const isActive = artist.status === 'ACTIVE';
              return (
                <div key={artist.id} className="border rounded-lg p-4 bg-card space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{artist.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{artist.email}</p>
                    </div>
                    <Badge className={isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                      {artist.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    ID: {artist.id.slice(0, 12)}...
                  </div>
                  <Button
                    variant={isActive ? "destructive" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusChange(artist.id, isActive ? 'INACTIVE' : 'ACTIVE')}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map((artist) => {
                  const isActive = artist.status === 'ACTIVE';
                  return (
                    <TableRow key={artist.id}>
                      <TableCell className="font-mono text-xs max-w-[100px] truncate">{artist.id}</TableCell>
                      <TableCell className="font-medium">{artist.name}</TableCell>
                      <TableCell>{artist.email}</TableCell>
                      <TableCell>
                        <Badge className={isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {artist.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleStatusChange(artist.id, isActive ? 'INACTIVE' : 'ACTIVE')}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default ArtistsTab;
