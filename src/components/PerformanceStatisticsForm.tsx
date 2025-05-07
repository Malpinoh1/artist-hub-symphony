
import React, { useState } from 'react';
import { toast } from 'sonner';
import { updatePerformanceStatistics } from '../services/statisticsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { themeClass } from '@/lib/utils';

interface PerformanceStatisticsFormProps {
  releaseId: string;
  existingStats: any | null;
  onClose: () => void;
  onSubmitted: () => void;
}

const PerformanceStatisticsForm: React.FC<PerformanceStatisticsFormProps> = ({
  releaseId,
  existingStats,
  onClose,
  onSubmitted
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_streams: existingStats?.total_streams || 0,
    spotify_streams: existingStats?.spotify_streams || 0,
    apple_music_streams: existingStats?.apple_music_streams || 0,
    youtube_music_streams: existingStats?.youtube_music_streams || 0,
    other_streams: existingStats?.other_streams || 0
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updatePerformanceStatistics(releaseId, stats);
      
      if (result.success) {
        toast.success('Performance statistics updated successfully');
        onSubmitted();
      } else {
        toast.error('Failed to update performance statistics');
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setStats({
      ...stats,
      [e.target.name]: value
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={themeClass(
        "bg-white border border-slate-200 shadow-xl",
        "bg-slate-900 border-slate-700"
      ) + " w-full max-w-md rounded-lg p-6"}>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Update Performance Statistics</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="spotify_streams">Spotify Streams</Label>
              <Input 
                id="spotify_streams"
                name="spotify_streams"
                type="number"
                min="0"
                value={stats.spotify_streams}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <Label htmlFor="apple_music_streams">Apple Music Streams</Label>
              <Input 
                id="apple_music_streams"
                name="apple_music_streams"
                type="number"
                min="0"
                value={stats.apple_music_streams}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <Label htmlFor="youtube_music_streams">YouTube Music Streams</Label>
              <Input 
                id="youtube_music_streams"
                name="youtube_music_streams"
                type="number"
                min="0"
                value={stats.youtube_music_streams}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <Label htmlFor="other_streams">Other Platform Streams</Label>
              <Input 
                id="other_streams"
                name="other_streams"
                type="number"
                min="0"
                value={stats.other_streams}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <Label htmlFor="total_streams">Total Streams</Label>
              <Input 
                id="total_streams"
                name="total_streams"
                type="number"
                min="0"
                value={stats.total_streams}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total should be the sum of all platform streams.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Statistics'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceStatisticsForm;
