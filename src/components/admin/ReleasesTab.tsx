import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Release, updateReleaseStatus, updateReleaseIdentifiers } from '@/services/adminService';
import { toast } from 'sonner';
import { fetchReleaseDetails } from '@/services/releaseService';
import { fetchStreamingLinks, StreamingLink } from '@/services/streamingLinksService';
import PerformanceStatisticsEditor from './PerformanceStatisticsEditor';
import StreamingLinksEditor from './StreamingLinksEditor';
import StatusUpdateDialog from './dialogs/StatusUpdateDialog';
import IdentifiersUpdateDialog from './dialogs/IdentifiersUpdateDialog';
import ReleasesTableRow from './ReleasesTableRow';
import { PerformanceStatistics } from '@/services/statisticsService';

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
  
  const openStatusDialog = (release: Release) => {
    setSelectedRelease(release);
    setSelectedStatus(release.status);
    setStatusDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!selectedRelease || !selectedStatus) return;
    
    try {
      const result = await updateReleaseStatus(selectedRelease.id, selectedStatus as any);
      
      if (result.success) {
        toast.success(`Release status updated to ${selectedStatus}`);
        onReleaseUpdate(selectedRelease.id, selectedStatus, result.data);
        setStatusDialogOpen(false);
      } else {
        console.error('Failed to update release status:', result.error);
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
        onReleaseUpdate(selectedRelease.id, selectedRelease.status, result.data);
        setIdentifierDialogOpen(false);
      } else {
        console.error('Failed to update release identifiers:', result.error);
        toast.error('Failed to update release identifiers');
      }
    } catch (error) {
      console.error('Error updating release identifiers:', error);
      toast.error('An error occurred while updating identifiers');
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

  const handleStatsUpdate = () => {
    if (selectedRelease) {
      fetchReleaseStats(selectedRelease.id);
      toast.success("Statistics updated successfully");
    }
  };

  const handleLinksUpdate = () => {
    if (selectedRelease) {
      fetchReleaseLinks(selectedRelease.id);
      toast.success("Streaming links updated successfully");
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
                  <ReleasesTableRow
                    key={release.id}
                    release={release}
                    onStatusUpdate={openStatusDialog}
                    onIdentifiersUpdate={openIdentifiersDialog}
                    onStatsUpdate={openStatsDialog}
                    onLinksUpdate={openLinksDialog}
                  />
                ))
              )}
            </TableBody>
          </Table>

          <StatusUpdateDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            release={selectedRelease}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onSave={handleStatusChange}
          />

          <IdentifiersUpdateDialog
            open={identifierDialogOpen}
            onOpenChange={setIdentifierDialogOpen}
            release={selectedRelease}
            upc={upc}
            isrc={isrc}
            onUpcChange={setUpc}
            onIsrcChange={setIsrc}
            onSave={handleIdentifiersUpdate}
          />

          {selectedRelease && (
            <>
              <PerformanceStatisticsEditor
                releaseId={selectedRelease.id}
                currentStats={releaseStatistics}
                isOpen={statsDialogOpen}
                onClose={() => setStatsDialogOpen(false)}
                onUpdate={handleStatsUpdate}
              />

              <StreamingLinksEditor
                releaseId={selectedRelease.id}
                currentLinks={streamingLinks}
                isOpen={linksDialogOpen}
                onClose={() => setLinksDialogOpen(false)}
                onUpdate={handleLinksUpdate}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReleasesTab;
