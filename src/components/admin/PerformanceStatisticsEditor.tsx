
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePerformanceStatistics, PerformanceStatistics } from '@/services/statisticsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PerformanceStatisticsEditorProps {
  releaseId: string;
  currentStats: PerformanceStatistics | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PerformanceStatisticsEditor = ({ 
  releaseId, 
  currentStats, 
  isOpen, 
  onClose, 
  onUpdate 
}: PerformanceStatisticsEditorProps) => {
  const [totalStreams, setTotalStreams] = useState<string>('0');
  const [spotifyStreams, setSpotifyStreams] = useState<string>('0');
  const [appleMusicStreams, setAppleMusicStreams] = useState<string>('0');
  const [youtubeMusicStreams, setYoutubeMusicStreams] = useState<string>('0');
  const [otherStreams, setOtherStreams] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form with current stats if available
  useEffect(() => {
    if (currentStats) {
      setSpotifyStreams(currentStats.spotify_streams.toString());
      setAppleMusicStreams(currentStats.apple_music_streams.toString());
      setYoutubeMusicStreams(currentStats.youtube_music_streams.toString());
      setOtherStreams(currentStats.other_streams.toString());
      setTotalStreams(currentStats.total_streams.toString());
    } else {
      resetForm();
    }
  }, [currentStats, isOpen]);
  
  const resetForm = () => {
    setSpotifyStreams('0');
    setAppleMusicStreams('0');
    setYoutubeMusicStreams('0');
    setOtherStreams('0');
    setTotalStreams('0');
    setError(null);
  };
  
  // Calculate total streams based on individual platform streams
  useEffect(() => {
    const spotify = parseInt(spotifyStreams) || 0;
    const apple = parseInt(appleMusicStreams) || 0;
    const youtube = parseInt(youtubeMusicStreams) || 0;
    const other = parseInt(otherStreams) || 0;
    
    setTotalStreams((spotify + apple + youtube + other).toString());
  }, [spotifyStreams, appleMusicStreams, youtubeMusicStreams, otherStreams]);

  const validateForm = () => {
    const spotify = parseInt(spotifyStreams);
    const apple = parseInt(appleMusicStreams);
    const youtube = parseInt(youtubeMusicStreams);
    const other = parseInt(otherStreams);
    
    if (isNaN(spotify) || isNaN(apple) || isNaN(youtube) || isNaN(other)) {
      setError("All stream counts must be valid numbers");
      return false;
    }
    
    if (spotify < 0 || apple < 0 || youtube < 0 || other < 0) {
      setError("Stream counts cannot be negative");
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const stats = {
        total_streams: parseInt(totalStreams),
        spotify_streams: parseInt(spotifyStreams),
        apple_music_streams: parseInt(appleMusicStreams),
        youtube_music_streams: parseInt(youtubeMusicStreams),
        other_streams: parseInt(otherStreams)
      };
      
      const result = await updatePerformanceStatistics(releaseId, stats);
      
      if (result.success) {
        toast.success("Performance statistics updated successfully");
        onUpdate();
        onClose();
      } else {
        setError("Failed to update performance statistics");
        toast.error("Failed to update performance statistics");
      }
    } catch (err) {
      console.error("Error updating performance statistics:", err);
      setError("An error occurred while updating statistics");
      toast.error("An error occurred while updating statistics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Performance Statistics</DialogTitle>
          <DialogDescription>
            Manually update streaming statistics for this release
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalStreams" className="text-right">
                Total Streams
              </Label>
              <Input
                id="totalStreams"
                type="number"
                value={totalStreams}
                readOnly
                className="col-span-3 bg-slate-100 dark:bg-slate-800"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="spotifyStreams" className="text-right">
                Spotify Streams
              </Label>
              <Input
                id="spotifyStreams"
                type="number"
                value={spotifyStreams}
                onChange={(e) => setSpotifyStreams(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="appleMusicStreams" className="text-right">
                Apple Music
              </Label>
              <Input
                id="appleMusicStreams"
                type="number"
                value={appleMusicStreams}
                onChange={(e) => setAppleMusicStreams(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="youtubeMusicStreams" className="text-right">
                YouTube Music
              </Label>
              <Input
                id="youtubeMusicStreams"
                type="number"
                value={youtubeMusicStreams}
                onChange={(e) => setYoutubeMusicStreams(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="otherStreams" className="text-right">
                Other Platforms
              </Label>
              <Input
                id="otherStreams"
                type="number"
                value={otherStreams}
                onChange={(e) => setOtherStreams(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceStatisticsEditor;
