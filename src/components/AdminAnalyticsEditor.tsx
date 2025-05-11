
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { fetchPlatformAnalytics, updatePlatformAnalytics } from '../services/statisticsService';

// Define the interface for platform analytics data
interface PlatformAnalyticsData {
  id?: string;
  spotify_plays: number;
  spotify_growth: number;
  apple_music_plays: number;
  apple_music_growth: number;
  youtube_music_plays: number;
  youtube_music_growth: number;
  deezer_plays: number;
  deezer_growth: number;
  last_updated?: string;
}

const AdminAnalyticsEditor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<PlatformAnalyticsData>({
    spotify_plays: 0,
    spotify_growth: 0,
    apple_music_plays: 0,
    apple_music_growth: 0,
    youtube_music_plays: 0,
    youtube_music_growth: 0,
    deezer_plays: 0,
    deezer_growth: 0
  });
  
  // Fetch current analytics data
  const loadAnalyticsData = async () => {
    try {
      setIsFetching(true);
      
      const data = await fetchPlatformAnalytics();
      
      if (data) {
        setAnalyticsData({
          id: data.id,
          spotify_plays: data.spotify_plays || 0, 
          spotify_growth: data.spotify_growth || 0,
          apple_music_plays: data.apple_music_plays || 0, 
          apple_music_growth: data.apple_music_growth || 0,
          youtube_music_plays: data.youtube_music_plays || 0, 
          youtube_music_growth: data.youtube_music_growth || 0,
          deezer_plays: data.deezer_plays || 0, 
          deezer_growth: data.deezer_growth || 0 
        });
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({
        title: 'Error loading analytics',
        description: 'Could not load existing analytics data',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    loadAnalyticsData();
  }, []);
  
  const handleInputChange = (field: string, value: string) => {
    setAnalyticsData(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };
  
  const handleSaveAnalytics = async () => {
    try {
      setLoading(true);
      
      const result = await updatePlatformAnalytics({
        spotify_plays: analyticsData.spotify_plays,
        spotify_growth: analyticsData.spotify_growth,
        apple_music_plays: analyticsData.apple_music_plays,
        apple_music_growth: analyticsData.apple_music_growth,
        youtube_music_plays: analyticsData.youtube_music_plays,
        youtube_music_growth: analyticsData.youtube_music_growth,
        deezer_plays: analyticsData.deezer_plays,
        deezer_growth: analyticsData.deezer_growth
      });
        
      if (result.success) {
        toast({
          title: 'Analytics updated',
          description: 'Platform analytics data has been updated successfully',
        });
      } else {
        throw new Error("Failed to update analytics");
      }
    } catch (error) {
      console.error("Error updating analytics:", error);
      toast({
        title: 'Update failed',
        description: 'Could not update analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAnalyticsData();
    toast({
      title: 'Analytics refreshed',
      description: 'Latest analytics data loaded'
    });
  };
  
  // Platform configuration for rendering
  const platforms = [
    { id: 'spotify', name: 'Spotify', color: 'text-green-600', bgColor: 'bg-white dark:bg-slate-800', playsField: 'spotify_plays', growthField: 'spotify_growth' },
    { id: 'appleMusic', name: 'Apple Music', color: 'text-red-600', bgColor: 'bg-white dark:bg-slate-800', playsField: 'apple_music_plays', growthField: 'apple_music_growth' },
    { id: 'youtubeMusic', name: 'YouTube Music', color: 'text-purple-600', bgColor: 'bg-white dark:bg-slate-800', playsField: 'youtube_music_plays', growthField: 'youtube_music_growth' },
    { id: 'deezer', name: 'Deezer', color: 'text-blue-600', bgColor: 'bg-white dark:bg-slate-800', playsField: 'deezer_plays', growthField: 'deezer_growth' }
  ];
  
  return (
    <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold dark:text-white">Edit Platform Analytics</h3>
        <button
          onClick={handleRefresh}
          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          disabled={isFetching}
        >
          <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Update play counts and growth rates for each platform</p>
      
      {isFetching ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600 dark:text-slate-400">Loading analytics data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {platforms.map((platform) => (
            <div 
              key={platform.id}
              className={`p-4 border border-slate-200 dark:border-slate-700 rounded-md ${platform.bgColor}`}
            >
              <h4 className={`font-medium ${platform.color} mb-3`}>{platform.name}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Plays</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                    value={analyticsData[platform.playsField as keyof PlatformAnalyticsData]}
                    onChange={(e) => handleInputChange(platform.playsField, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Growth %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                    value={analyticsData[platform.growthField as keyof PlatformAnalyticsData]}
                    onChange={(e) => handleInputChange(platform.growthField, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={handleSaveAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center disabled:bg-blue-400 dark:disabled:bg-blue-800"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Analytics
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsEditor;
