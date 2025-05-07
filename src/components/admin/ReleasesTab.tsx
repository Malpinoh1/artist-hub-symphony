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
import { MoreVertical, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { updateReleaseStatus } from '@/services/adminService';
import { toast } from 'sonner';

interface ReleasesTabProps {
  releases: any[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string) => void;
}

const ReleasesTab: React.FC<ReleasesTabProps> = ({ releases, loading, onReleaseUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell className="font-medium">{release.id}</TableCell>
                  <TableCell>{release.title}</TableCell>
                  <TableCell>{release.artist_name}</TableCell>
                  <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
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
        </div>
      )}
    </div>
  );
};

export default ReleasesTab;
