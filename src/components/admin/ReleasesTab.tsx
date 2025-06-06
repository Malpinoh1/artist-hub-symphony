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
import { MoreVertical, Pencil, Barcode, BarChart, Link } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchReleaseDetails } from '@/services/releaseService';
import { fetchStreamingLinks, StreamingLink } from '@/services/streamingLinksService';
import PerformanceStatisticsEditor from './PerformanceStatisticsEditor';
import StreamingLinksEditor from './StreamingLinksEditor';
import { PerformanceStatistics } from '@/services/statisticsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReleasesTabProps {
  releases: Release[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string, updatedData?: any) => void;
}

const ReleasesTab: React.FC<ReleasesTabProps> = ({ releases, loading, onReleaseUpdate }) => {
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [upc, setUpc] = useState('');
  const [isrc, setIsrc] = useState('');
  const [identifierDialogOpen, setIdentifierDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [releaseStatistics, setReleaseStatistics] = useState<PerformanceStatistics | null>(null);
  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Take Down', value: 'TakeDown' },
    { label: 'Take Down Requested', value: 'TakeDownRequested' },
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700';
      case 'Rejected':
      case 'TakeDown':
        return 'bg-red-100 text-red-700';
      case 'TakeDownRequested':
        return 'bg-orange-100 text-orange-700';
      case 'Processing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };
  
  const openStatusDialog = (release: Release) => {
    console.log('Opening status dialog for release:', release);
    setSelectedRelease(release);
    setSelectedStatus(release.status);
    setStatusDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!selectedRelease || !selectedStatus || updating) {
      console.log('Cannot update status: missing data or already updating');
      return;
    }
    
    setUpdating(true);
    console.log(`Attempting to update release ${selectedRelease.id} status from ${selectedRelease.status} to ${selectedStatus}`);
    
    try {
      const result = await updateReleaseStatus(selectedRelease.id, selectedStatus as any);
      
      console.log('Status update result:', result);
      
      if (result.success && result.data) {
        console.log('Status update successful, updating UI with:', result.data);
        onReleaseUpdate(selectedRelease.id, selectedStatus, result.data);
        toast.success(`Release status updated to ${selectedStatus}`);
        setStatusDialogOpen(false);
        setSelectedRelease(null);
        setSelectedStatus('');
      } else {
        console.error('Failed to update release status:', result.error);
        toast.error(`Failed to update release status: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating release status:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setUpdating(false);
    }
  };

  const openIdentifiersDialog = (release: Release) => {
    console.log('Opening identifiers dialog for release:', release);
    setSelectedRelease(release);
    setUpc(release.upc || '');
    setIsrc(release.isrc || '');
    setIdentifierDialogOpen(true);
  };

  const handleIdentifiersUpdate = async () => {
    if (!selectedRelease || updating) {
      console.log('Cannot update identifiers: missing data or already updating');
      return;
    }
    
    setUpdating(true);
    console.log(`Attempting to update identifiers for release ${selectedRelease.id}`);
    
    try {
      const result = await updateReleaseIdentifiers(selectedRelease.id, upc, isrc);
      
      console.log('Identifiers update result:', result);
      
      if (result.success && result.data) {
        console.log('Identifiers update successful, updating UI with:', result.data);
        onReleaseUpdate(selectedRelease.id, selectedRelease.status, result.data);
        toast.success('Release identifiers updated successfully');
        setIdentifierDialogOpen(false);
        setSelectedRelease(null);
        setUpc('');
        setIsrc('');
      } else {
        console.error('Failed to update release identifiers:', result.error);
        toast.error(`Failed to update release identifiers: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating release identifiers:', error);
      toast.error('An error occurred while updating identifiers');
    } finally {
      setUpdating(false);
    }
  };

  const fetchReleaseStats = async (releaseId: string) => {
    setLoadingDetails(true);
    try {
      const releaseDetails = await fetchReleaseDetails(releaseId);
      if (releaseDetails) {
        setReleaseStatistics(releaseDetails.statistics || null);
      }
    } catch (error) {
      console.error("Error fetching release statistics:", error);
      toast.error("Could not load release statistics");
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchReleaseLinks = async (releaseId: string) => {
    setLoadingDetails(true);
    try {
      const links = await fetchStreamingLinks(releaseId);
      setStreamingLinks(links || []);
    } catch (error) {
      console.error("Error fetching streaming links:", error);
      toast.error("Could not load streaming links");
    } finally {
      setLoadingDetails(false);
    }
  };

  const openStatsDialog = async (release: Release) => {
    setSelectedRelease(release);
    await fetchReleaseStats(release.id);
    setStatsDialogOpen(true);
  };

  const openLinksDialog = async (release: Release) => {
    setSelectedRelease(release);
    await fetchReleaseLinks(release.id);
    setLinksDialogOpen(true);
  };

  const handleStatsUpdate = async () => {
    if (selectedRelease) {
      await fetchReleaseStats(selectedRelease.id);
      toast.success("Statistics updated successfully");
      setStatsDialogOpen(false);
      setSelectedRelease(null);
    }
  };

  const handleLinksUpdate = async () => {
    if (selectedRelease) {
      await fetchReleaseLinks(selectedRelease.id);
      toast.success("Streaming links updated successfully");
      setLinksDialogOpen(false);
      setSelectedRelease(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
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
              {releases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No releases found
                  </TableCell>
                </TableRow>
              ) : (
                releases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="font-medium">{release.id.substring(0, 8)}...</TableCell>
                    <TableCell>{release.title}</TableCell>
                    <TableCell>{release.artists?.[0]?.name || 'Unknown'}</TableCell>
                    <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
                    <TableCell>{release.upc || 'Not assigned'}</TableCell>
                    <TableCell>{release.isrc || 'Not assigned'}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`cursor-pointer ${getStatusColor(release.status)}`}
                        onClick={() => openStatusDialog(release)}
                      >
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
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Manage Release</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => openStatusDialog(release)}
                            className="text-violet-600 font-medium"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openIdentifiersDialog(release)}
                          >
                            <Barcode className="mr-2 h-4 w-4" />
                            Update Identifiers
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openStatsDialog(release)}
                          >
                            <BarChart className="mr-2 h-4 w-4" />
                            Update Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openLinksDialog(release)}
                          >
                            <Link className="mr-2 h-4 w-4" />
                            Update Streaming Links
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Status Dialog */}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Release Status</DialogTitle>
                <DialogDescription>
                  Change the status for "{selectedRelease?.title}"
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setStatusDialogOpen(false);
                    setSelectedRelease(null);
                    setSelectedStatus('');
                  }} 
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleStatusChange} 
                  disabled={updating || !selectedStatus}
                >
                  {updating ? 'Updating...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Identifiers Dialog */}
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIdentifierDialogOpen(false);
                    setSelectedRelease(null);
                    setUpc('');
                    setIsrc('');
                  }} 
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleIdentifiersUpdate} 
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Performance Statistics Editor Dialog */}
          {selectedRelease && (
            <PerformanceStatisticsEditor
              releaseId={selectedRelease.id}
              currentStats={releaseStatistics}
              isOpen={statsDialogOpen}
              onClose={() => setStatsDialogOpen(false)}
              onUpdate={handleStatsUpdate}
            />
          )}

          {/* Streaming Links Editor Dialog */}
          {selectedRelease && (
            <StreamingLinksEditor
              releaseId={selectedRelease.id}
              currentLinks={streamingLinks}
              isOpen={linksDialogOpen}
              onClose={() => setLinksDialogOpen(false)}
              onUpdate={handleLinksUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ReleasesTab;
