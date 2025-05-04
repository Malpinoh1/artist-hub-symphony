
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

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
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_analytics')
          .select('*')
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setAnalyticsData({
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
      }
    };
    
    fetchData();
  }, [toast]);
  
  const handleInputChange = (field: string, value: string) => {
    setAnalyticsData(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };
  
  const handleSaveAnalytics = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('platform_analytics')
        .upsert({
          spotify_plays: analyticsData.spotify_plays,
          spotify_growth: analyticsData.spotify_growth,
          apple_music_plays: analyticsData.apple_music_plays,
          apple_music_growth: analyticsData.apple_music_growth,
          youtube_music_plays: analyticsData.youtube_music_plays,
          youtube_music_growth: analyticsData.youtube_music_growth,
          deezer_plays: analyticsData.deezer_plays,
          deezer_growth: analyticsData.deezer_growth,
          last_updated: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast({
        title: 'Analytics updated',
        description: 'Platform analytics data has been updated successfully',
      });
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
  
  // Platform configuration for rendering
  const platforms = [
    { id: 'spotify', name: 'Spotify', color: 'text-green-600', bgColor: 'bg-white', playsField: 'spotify_plays', growthField: 'spotify_growth' },
    { id: 'appleMusic', name: 'Apple Music', color: 'text-red-600', bgColor: 'bg-white', playsField: 'apple_music_plays', growthField: 'apple_music_growth' },
    { id: 'youtubeMusic', name: 'YouTube Music', color: 'text-purple-600', bgColor: 'bg-white', playsField: 'youtube_music_plays', growthField: 'youtube_music_growth' },
    { id: 'deezer', name: 'Deezer', color: 'text-blue-600', bgColor: 'bg-white', playsField: 'deezer_plays', growthField: 'deezer_growth' }
  ];
  
  return (
    <div className="glass-panel p-6">
      <h3 className="text-xl font-semibold mb-4">Edit Platform Analytics</h3>
      <p className="text-slate-500 mb-6">Update play counts and growth rates for each platform</p>
      
      <div className="space-y-6">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="p-4 border border-slate-200 rounded-md bg-white"
          >
            <h4 className={`font-medium ${platform.color} mb-3`}>{platform.name}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">Plays</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={analyticsData[platform.playsField as keyof PlatformAnalyticsData]}
                  onChange={(e) => handleInputChange(platform.playsField, e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Growth %</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 border border-slate-300 rounded-md"
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
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Analytics
        </button>
      </div>
    </div>
  );
};

export default AdminAnalyticsEditor;
