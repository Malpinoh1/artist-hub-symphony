
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Pencil, Barcode, Database } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { Release, updateReleaseStatus, updateReleaseIdentifiers } from '@/services/adminService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReleasesTabProps {
  releases: Release[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string) => void;
}

const ReleasesTab: React.FC<ReleasesTabProps> = ({ releases, loading, onReleaseUpdate }) => {
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [upc, setUpc] = useState('');
  const [isrc, setIsrc] = useState('');
  const [identifierDialogOpen, setIdentifierDialogOpen] = useState(false);
  
  const statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'TakeDown', value: 'TakeDown' },
    { label: 'TakeDownRequested', value: 'TakeDownRequested' },
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Rejected':
      case 'TakeDown':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'TakeDownRequested':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Processing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };
  
  const handleStatusChange = async (releaseId: string, status: string) => {
    try {
      const result = await updateReleaseStatus(releaseId, status as any);
      
      if (result.success) {
        toast.success('Release status updated successfully');
        onReleaseUpdate(releaseId, status);
      } else {
        toast.error('Failed to update release status');
      }
    } catch (error) {
      console.error('Error updating release status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  const openIdentifiersDialog = (release: Release) => {
    setSelectedRelease(release);
    setUpc(release.upc || '');
    setIsrc(release.isrc || '');
    setIdentifierDialogOpen(true);
  };

  const handleIdentifiersUpdate = async () => {
    if (!selectedRelease) return;
    
    try {
      const result = await updateReleaseIdentifiers(selectedRelease.id, upc, isrc);
      
      if (result.success) {
        toast.success('Release identifiers updated successfully');
        // Update the local state to reflect changes
        onReleaseUpdate(selectedRelease.id, selectedRelease.status);
        setIdentifierDialogOpen(false);
      } else {
        toast.error('Failed to update release identifiers');
      }
    } catch (error) {
      console.error('Error updating release identifiers:', error);
      toast.error('An error occurred while updating identifiers');
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>UPC</TableHead>
                <TableHead>ISRC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell className="font-medium">{release.id.substring(0, 8)}...</TableCell>
                  <TableCell>{release.title}</TableCell>
                  <TableCell>{release.artists?.[0]?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
                  <TableCell>{release.upc || 'Not assigned'}</TableCell>
                  <TableCell>{release.isrc || 'Not assigned'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(release.status)}>
                      {release.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => openIdentifiersDialog(release)}
                        >
                          <Barcode className="mr-2 h-4 w-4" />
                          Update Identifiers
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(release.id, 'Approved')}
                        >
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(release.id, 'Rejected')}
                        >
                          Reject
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(release.id, 'TakeDown')}
                        >
                          Take Down
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Dialog open={identifierDialogOpen} onOpenChange={setIdentifierDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Release Identifiers</DialogTitle>
                <DialogDescription>
                  Update the UPC and ISRC for "{selectedRelease?.title}"
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="upc" className="text-right">
                    UPC
                  </Label>
                  <Input
                    id="upc"
                    value={upc}
                    onChange={(e) => setUpc(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter UPC"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isrc" className="text-right">
                    ISRC
                  </Label>
                  <Input
                    id="isrc"
                    value={isrc}
                    onChange={(e) => setIsrc(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter ISRC"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIdentifierDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleIdentifiersUpdate}>
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ReleasesTab;
