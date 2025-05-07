
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
  
  // Initialize form with current stats if available
  useEffect(() => {
    if (currentStats) {
      setTotalStreams(currentStats.total_streams.toString());
      setSpotifyStreams(currentStats.spotify_streams.toString());
      setAppleMusicStreams(currentStats.apple_music_streams.toString());
      setYoutubeMusicStreams(currentStats.youtube_music_streams.toString());
      setOtherStreams(currentStats.other_streams.toString());
    }
  }, [currentStats]);
  
  // Calculate total streams based on individual platform streams
  useEffect(() => {
    const spotify = parseInt(spotifyStreams) || 0;
    const apple = parseInt(appleMusicStreams) || 0;
    const youtube = parseInt(youtubeMusicStreams) || 0;
    const other = parseInt(otherStreams) || 0;
    
    setTotalStreams((spotify + apple + youtube + other).toString());
  }, [spotifyStreams, appleMusicStreams, youtubeMusicStreams, otherStreams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
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
        toast.error("Failed to update performance statistics");
      }
    } catch (error) {
      console.error("Error updating performance statistics:", error);
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
                className="col-span-3 bg-slate-100"
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
