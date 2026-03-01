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
import { MoreVertical, Pencil, Barcode, BarChart, Link, Trash2, Plus, Download, User, Eye, Image, Music, FileDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { Release, updateReleaseStatus, updateReleaseIdentifiers, updateReleaseArtistName, deleteRelease } from '@/services/adminService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchReleaseDetails } from '@/services/releaseService';
import { fetchStreamingLinks, StreamingLink } from '@/services/streamingLinksService';
import PerformanceStatisticsEditor from './PerformanceStatisticsEditor';
import StreamingLinksEditor from './StreamingLinksEditor';
import AdminReleaseUpload from './AdminReleaseUpload';
import { PerformanceStatistics } from '@/services/statisticsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { downloadReleaseAssets } from '@/services/assetsService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReleasesTabProps {
  releases: Release[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string, updatedData?: any) => void;
  onRefreshData?: () => void;
}

const ReleasesTab: React.FC<ReleasesTabProps> = ({ releases, loading, onReleaseUpdate, onRefreshData }) => {
  const isMobile = useIsMobile();
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [upc, setUpc] = useState('');
  const [isrc, setIsrc] = useState('');
  const [identifierDialogOpen, setIdentifierDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [releaseStatistics, setReleaseStatistics] = useState<PerformanceStatistics | null>(null);
  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [artistNameDialogOpen, setArtistNameDialogOpen] = useState(false);
  const [artistNameInput, setArtistNameInput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
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
    setSelectedRelease(release);
    setSelectedStatus(release.status);
    setRejectionReason('');
    setStatusDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!selectedRelease || !selectedStatus || updating) return;
    if (selectedStatus === 'Rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setUpdating(true);
    try {
      const result = await updateReleaseStatus(selectedRelease.id, selectedStatus as any, selectedStatus === 'Rejected' ? rejectionReason : undefined);
      if (result.success && result.data) {
        onReleaseUpdate(selectedRelease.id, selectedStatus, result.data);
        if (selectedStatus === 'Approved') toast.success('Release approved and artist notified via email');
        else if (selectedStatus === 'Rejected') toast.success('Release rejected and artist notified via email');
        else toast.success(`Release status updated to ${selectedStatus}`);
        setStatusDialogOpen(false);
        setSelectedRelease(null);
        setSelectedStatus('');
        setRejectionReason('');
      } else {
        toast.error(`Failed to update release status: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('An error occurred while updating status');
    } finally {
      setUpdating(false);
    }
  };

  const openIdentifiersDialog = (release: Release) => {
    setSelectedRelease(release);
    setUpc(release.upc || '');
    setIsrc(release.isrc || '');
    setIdentifierDialogOpen(true);
  };

  const handleIdentifiersUpdate = async () => {
    if (!selectedRelease || updating) return;
    setUpdating(true);
    try {
      const result = await updateReleaseIdentifiers(selectedRelease.id, upc, isrc);
      if (result.success && result.data) {
        onReleaseUpdate(selectedRelease.id, selectedRelease.status, result.data);
        toast.success('Release identifiers updated successfully');
        setIdentifierDialogOpen(false);
        setSelectedRelease(null);
        setUpc('');
        setIsrc('');
      } else {
        toast.error(`Failed to update release identifiers: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('An error occurred while updating identifiers');
    } finally {
      setUpdating(false);
    }
  };

  const fetchReleaseStats = async (releaseId: string) => {
    setLoadingDetails(true);
    try {
      const releaseDetails = await fetchReleaseDetails(releaseId);
      if (releaseDetails) setReleaseStatistics(releaseDetails.statistics || null);
    } catch (error) {
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

  const openDeleteDialog = (release: Release) => {
    setReleaseToDelete(release);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRelease = async () => {
    if (!releaseToDelete || deleting) return;
    setDeleting(true);
    try {
      const result = await deleteRelease(releaseToDelete.id);
      if (result.success) {
        toast.success(`Release "${releaseToDelete.title}" deleted successfully`);
        setDeleteDialogOpen(false);
        setReleaseToDelete(null);
        onRefreshData?.();
      } else {
        toast.error(`Failed to delete release: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('An error occurred while deleting the release');
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadSuccess = () => {
    onRefreshData?.();
  };

  const openArtistNameDialog = (release: Release) => {
    setSelectedRelease(release);
    setArtistNameInput(release.artist_name || release.artists?.[0]?.name || '');
    setArtistNameDialogOpen(true);
  };

  const handleArtistNameUpdate = async () => {
    if (!selectedRelease || updating || !artistNameInput.trim()) return;
    setUpdating(true);
    try {
      const result = await updateReleaseArtistName(selectedRelease.id, artistNameInput.trim());
      if (result.success && result.data) {
        onReleaseUpdate(selectedRelease.id, selectedRelease.status, result.data);
        toast.success('Artist name updated successfully');
        setArtistNameDialogOpen(false);
        setSelectedRelease(null);
        setArtistNameInput('');
      } else {
        toast.error(`Failed to update artist name: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('An error occurred while updating artist name');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadCoverArt = async (release: Release) => {
    if (!release.cover_art_url) {
      toast.error('No cover art available');
      return;
    }
    try {
      const artistName = release.artist_name || release.artists?.[0]?.name || 'Unknown';
      const link = document.createElement('a');
      link.href = release.cover_art_url;
      link.download = `${release.title} - ${artistName} - Cover Art.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Cover art download started');
    } catch (error) {
      toast.error('Failed to download cover art');
    }
  };

  const handleDownloadAudio = async (release: Release) => {
    if (!release.audio_file_url) {
      toast.error('No audio file available');
      return;
    }
    try {
      const artistName = release.artist_name || release.artists?.[0]?.name || 'Unknown';
      const link = document.createElement('a');
      link.href = release.audio_file_url;
      link.download = `${release.title} - ${artistName}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Audio file download started');
    } catch (error) {
      toast.error('Failed to download audio file');
    }
  };

  const handleDownloadAllAssets = async (release: Release) => {
    setDownloading(true);
    try {
      if (release.cover_art_url) handleDownloadCoverArt(release);
      if (release.audio_file_url) {
        await new Promise(resolve => setTimeout(resolve, 500));
        handleDownloadAudio(release);
      }
      if (!release.audio_file_url && !release.cover_art_url) {
        toast.error('No assets available for download');
      }
    } catch (error) {
      toast.error('Failed to download assets');
    } finally {
      setDownloading(false);
    }
  };

  const openDetailsDialog = (release: Release) => {
    setSelectedRelease(release);
    setDetailsDialogOpen(true);
  };

  const renderReleaseDetailsContent = () => {
    if (!selectedRelease) return null;
    const artistName = selectedRelease.artist_name || selectedRelease.artists?.[0]?.name || 'Unknown';
    const tracks = selectedRelease.release_tracks || [];

    return (
      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-6 pr-2">
          {/* Cover Art & Basic Info */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-40 flex-shrink-0">
              {selectedRelease.cover_art_url ? (
                <img 
                  src={selectedRelease.cover_art_url} 
                  alt={selectedRelease.title}
                  className="w-full aspect-square object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <Image className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold truncate">{selectedRelease.title}</h3>
              <p className="text-muted-foreground">{artistName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={getStatusColor(selectedRelease.status)}>{selectedRelease.status}</Badge>
                {selectedRelease.release_type && (
                  <Badge variant="secondary" className="capitalize">{selectedRelease.release_type}</Badge>
                )}
                {selectedRelease.genre && <Badge variant="outline">{selectedRelease.genre}</Badge>}
                {selectedRelease.explicit_content && <Badge variant="destructive">Explicit</Badge>}
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadCoverArt(selectedRelease)}
              disabled={!selectedRelease.cover_art_url}
            >
              <Image className="w-4 h-4 mr-2" />
              Download Cover Art
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadAudio(selectedRelease)}
              disabled={!selectedRelease.audio_file_url}
            >
              <Music className="w-4 h-4 mr-2" />
              Download Audio
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadAllAssets(selectedRelease)}
              disabled={!selectedRelease.cover_art_url && !selectedRelease.audio_file_url}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>

          {/* Release Information */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Release Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Release Date:</span>
                <p className="font-medium">{new Date(selectedRelease.release_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Tracks:</span>
                <p className="font-medium">{selectedRelease.total_tracks || 1}</p>
              </div>
              <div>
                <span className="text-muted-foreground">UPC:</span>
                <p className="font-medium">{selectedRelease.upc || 'Not assigned'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">ISRC:</span>
                <p className="font-medium">{selectedRelease.isrc || 'Not assigned'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Language:</span>
                <p className="font-medium">{selectedRelease.primary_language || 'English'}</p>
              </div>
              {selectedRelease.platforms && selectedRelease.platforms.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Platforms:</span>
                  <p className="font-medium">{selectedRelease.platforms.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Credits */}
          {(selectedRelease.producer_credits || selectedRelease.songwriter_credits || selectedRelease.artwork_credits || selectedRelease.copyright_info) && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Credits</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {selectedRelease.producer_credits && (
                  <div>
                    <span className="text-muted-foreground">Producer(s):</span>
                    <p className="font-medium">{selectedRelease.producer_credits}</p>
                  </div>
                )}
                {selectedRelease.songwriter_credits && (
                  <div>
                    <span className="text-muted-foreground">Songwriter(s):</span>
                    <p className="font-medium">{selectedRelease.songwriter_credits}</p>
                  </div>
                )}
                {selectedRelease.artwork_credits && (
                  <div>
                    <span className="text-muted-foreground">Artwork Credits:</span>
                    <p className="font-medium">{selectedRelease.artwork_credits}</p>
                  </div>
                )}
                {selectedRelease.copyright_info && (
                  <div>
                    <span className="text-muted-foreground">Copyright:</span>
                    <p className="font-medium">{selectedRelease.copyright_info}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description & Notes */}
          {(selectedRelease.description || selectedRelease.submission_notes || selectedRelease.admin_notes) && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              {selectedRelease.description && (
                <div>
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-1">Description</h4>
                  <p className="text-sm">{selectedRelease.description}</p>
                </div>
              )}
              {selectedRelease.submission_notes && (
                <div>
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-1">Submission Notes</h4>
                  <p className="text-sm">{selectedRelease.submission_notes}</p>
                </div>
              )}
              {selectedRelease.admin_notes && (
                <div>
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-1">Admin Notes</h4>
                  <p className="text-sm text-destructive">{selectedRelease.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Tracklist */}
          {tracks.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Tracklist</h4>
              <ol className="space-y-2">
                {tracks.sort((a, b) => a.track_number - b.track_number).map((track) => (
                  <li key={track.id || track.track_number} className="flex items-center gap-3 text-sm p-2 bg-background rounded">
                    <span className="text-muted-foreground font-mono w-6 text-right">{track.track_number}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{track.title}</span>
                      {track.featured_artists && track.featured_artists.length > 0 && (
                        <span className="text-xs text-muted-foreground">feat. {track.featured_artists.join(', ')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.isrc && <span className="text-xs text-muted-foreground hidden sm:inline">ISRC: {track.isrc}</span>}
                      {track.explicit_content && <Badge variant="destructive" className="text-[10px] px-1 py-0">E</Badge>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Artist Info */}
          {selectedRelease.artists && selectedRelease.artists.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Artist Account</h4>
              <div className="text-sm">
                <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedRelease.artists[0].name}</span></p>
                <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedRelease.artists[0].email}</span></p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  const renderMobileCards = () => (
    <div className="space-y-3">
      {releases.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No releases found</div>
      ) : (
        releases.map((release) => {
          const artistName = release.artist_name || release.artists?.[0]?.name || 'Unknown';
          return (
            <div 
              key={release.id} 
              className="bg-background border rounded-lg p-4 space-y-3"
            >
              <div className="flex gap-3">
                {release.cover_art_url ? (
                  <img src={release.cover_art_url} alt={release.title} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{release.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{artistName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(release.release_date).toLocaleDateString()}</p>
                  <Badge className={`mt-1 text-xs ${getStatusColor(release.status)}`} onClick={() => openStatusDialog(release)}>
                    {release.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground">UPC: {release.upc || '—'}</span>
                <span className="text-muted-foreground">ISRC: {release.isrc || '—'}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openDetailsDialog(release)}>
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openStatusDialog(release)}>
                  <Pencil className="w-3 h-3 mr-1" /> Status
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleDownloadCoverArt(release)} disabled={!release.cover_art_url}>
                  <Image className="w-3 h-3 mr-1" /> Cover
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleDownloadAudio(release)} disabled={!release.audio_file_url}>
                  <Music className="w-3 h-3 mr-1" /> Audio
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs h-8">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => openIdentifiersDialog(release)}>
                      <Barcode className="mr-2 h-4 w-4" /> Update Identifiers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openStatsDialog(release)}>
                      <BarChart className="mr-2 h-4 w-4" /> Update Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openLinksDialog(release)}>
                      <Link className="mr-2 h-4 w-4" /> Streaming Links
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openArtistNameDialog(release)}>
                      <User className="mr-2 h-4 w-4" /> Edit Artist Name
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog(release)} className="text-red-600 focus:text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Release
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderDesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Cover</TableHead>
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
              <TableCell>
                {release.cover_art_url ? (
                  <img src={release.cover_art_url} alt={release.title} className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <Music className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">{release.title}</TableCell>
              <TableCell>{release.artist_name || release.artists?.[0]?.name || 'Unknown'}</TableCell>
              <TableCell>{new Date(release.release_date).toLocaleDateString()}</TableCell>
              <TableCell>{release.upc || '—'}</TableCell>
              <TableCell>{release.isrc || '—'}</TableCell>
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
                    <DropdownMenuItem onClick={() => openDetailsDialog(release)} className="text-blue-600 font-medium">
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openStatusDialog(release)} className="text-violet-600 font-medium">
                      <Pencil className="mr-2 h-4 w-4" /> Update Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openIdentifiersDialog(release)}>
                      <Barcode className="mr-2 h-4 w-4" /> Update Identifiers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openStatsDialog(release)}>
                      <BarChart className="mr-2 h-4 w-4" /> Update Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openLinksDialog(release)}>
                      <Link className="mr-2 h-4 w-4" /> Update Streaming Links
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openArtistNameDialog(release)}>
                      <User className="mr-2 h-4 w-4" /> Edit Artist Name
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDownloadCoverArt(release)} disabled={!release.cover_art_url}>
                      <Image className="mr-2 h-4 w-4" /> Download Cover Art
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadAudio(release)} disabled={!release.audio_file_url}>
                      <Music className="mr-2 h-4 w-4" /> Download Audio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadAllAssets(release)} disabled={downloading}>
                      <Download className="mr-2 h-4 w-4" /> {downloading ? 'Downloading...' : 'Download All Assets'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog(release)} className="text-red-600 focus:text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Release
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setUploadDialogOpen(true)} size={isMobile ? "sm" : "default"}>
              <Plus className="w-4 h-4 mr-2" /> Upload Release
            </Button>
          </div>
          
          {isMobile ? renderMobileCards() : (
            <div className="overflow-x-auto">{renderDesktopTable()}</div>
          )}

          {/* Release Details Dialog */}
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Release Details</DialogTitle>
                <DialogDescription>
                  Full details for "{selectedRelease?.title}"
                </DialogDescription>
              </DialogHeader>
              {renderReleaseDetailsContent()}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                {selectedRelease && (
                  <Button onClick={() => { setDetailsDialogOpen(false); openStatusDialog(selectedRelease); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Update Status
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Status Dialog */}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Release Status</DialogTitle>
                <DialogDescription>Change the status for "{selectedRelease?.title}"</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="sm:text-right">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStatus === 'Rejected' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                    <Label htmlFor="rejectionReason" className="sm:text-right pt-2">Reason</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="sm:col-span-3"
                      placeholder="Explain why this release is being rejected..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => { setStatusDialogOpen(false); setSelectedRelease(null); setSelectedStatus(''); setRejectionReason(''); }} disabled={updating}>Cancel</Button>
                <Button type="button" onClick={handleStatusChange} disabled={updating || !selectedStatus || (selectedStatus === 'Rejected' && !rejectionReason.trim())} variant={selectedStatus === 'Rejected' ? 'destructive' : 'default'}>
                  {updating ? 'Updating...' : selectedStatus === 'Approved' ? 'Approve Release' : selectedStatus === 'Rejected' ? 'Reject Release' : 'Save changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Identifiers Dialog */}
          <Dialog open={identifierDialogOpen} onOpenChange={setIdentifierDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Release Identifiers</DialogTitle>
                <DialogDescription>Update the UPC and ISRC for "{selectedRelease?.title}"</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="upc" className="sm:text-right">UPC</Label>
                  <Input id="upc" value={upc} onChange={(e) => setUpc(e.target.value)} className="sm:col-span-3" placeholder="Enter UPC" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="isrc" className="sm:text-right">ISRC</Label>
                  <Input id="isrc" value={isrc} onChange={(e) => setIsrc(e.target.value)} className="sm:col-span-3" placeholder="Enter ISRC" />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => { setIdentifierDialogOpen(false); setSelectedRelease(null); setUpc(''); setIsrc(''); }} disabled={updating}>Cancel</Button>
                <Button type="button" onClick={handleIdentifiersUpdate} disabled={updating}>{updating ? 'Updating...' : 'Save changes'}</Button>
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

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Release</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{releaseToDelete?.title}"? This action cannot be undone.
                  All associated tracks, streaming links, and statistics will also be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRelease} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Admin Release Upload Dialog */}
          <AdminReleaseUpload open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} onSuccess={handleUploadSuccess} />

          {/* Artist Name Edit Dialog */}
          <Dialog open={artistNameDialogOpen} onOpenChange={setArtistNameDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Artist Name</DialogTitle>
                <DialogDescription>Update the display artist name for "{selectedRelease?.title}"</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="artistName" className="sm:text-right">Artist Name</Label>
                  <Input id="artistName" value={artistNameInput} onChange={(e) => setArtistNameInput(e.target.value)} className="sm:col-span-3" placeholder="Enter artist name" />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => { setArtistNameDialogOpen(false); setSelectedRelease(null); setArtistNameInput(''); }} disabled={updating}>Cancel</Button>
                <Button type="button" onClick={handleArtistNameUpdate} disabled={updating || !artistNameInput.trim()}>{updating ? 'Updating...' : 'Save changes'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default ReleasesTab;
