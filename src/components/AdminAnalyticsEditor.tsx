
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

const AdminAnalyticsEditor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    spotify: { plays: 0, growth: 0 },
    appleMusic: { plays: 0, growth: 0 },
    youtubeMusic: { plays: 0, growth: 0 },
    deezer: { plays: 0, growth: 0 }
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
            spotify: { 
              plays: data.spotify_plays || 0, 
              growth: data.spotify_growth || 0 
            },
            appleMusic: { 
              plays: data.apple_music_plays || 0, 
              growth: data.apple_music_growth || 0 
            },
            youtubeMusic: { 
              plays: data.youtube_music_plays || 0, 
              growth: data.youtube_music_growth || 0 
            },
            deezer: { 
              plays: data.deezer_plays || 0, 
              growth: data.deezer_growth || 0 
            }
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
  
  const handleInputChange = (platform, field, value) => {
    setAnalyticsData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: Number(value)
      }
    }));
  };
  
  const handleSaveAnalytics = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        spotify_plays: analyticsData.spotify.plays,
        spotify_growth: analyticsData.spotify.growth,
        apple_music_plays: analyticsData.appleMusic.plays,
        apple_music_growth: analyticsData.appleMusic.growth,
        youtube_music_plays: analyticsData.youtubeMusic.plays,
        youtube_music_growth: analyticsData.youtubeMusic.growth,
        deezer_plays: analyticsData.deezer.plays,
        deezer_growth: analyticsData.deezer.growth
      };
      
      const { error } = await supabase
        .from('platform_analytics')
        .upsert(updateData);
        
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
  
  return (
    <div className="glass-panel p-6">
      <h3 className="text-xl font-semibold mb-4">Edit Platform Analytics</h3>
      <p className="text-slate-500 mb-6">Update play counts and growth rates for each platform</p>
      
      <div className="space-y-6">
        {/* Spotify */}
        <div className="p-4 border border-slate-200 rounded-md bg-white">
          <h4 className="font-medium text-green-600 mb-3">Spotify</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Plays</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.spotify.plays}
                onChange={(e) => handleInputChange('spotify', 'plays', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Growth %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.spotify.growth}
                onChange={(e) => handleInputChange('spotify', 'growth', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Apple Music */}
        <div className="p-4 border border-slate-200 rounded-md bg-white">
          <h4 className="font-medium text-red-600 mb-3">Apple Music</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Plays</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.appleMusic.plays}
                onChange={(e) => handleInputChange('appleMusic', 'plays', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Growth %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.appleMusic.growth}
                onChange={(e) => handleInputChange('appleMusic', 'growth', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* YouTube Music */}
        <div className="p-4 border border-slate-200 rounded-md bg-white">
          <h4 className="font-medium text-purple-600 mb-3">YouTube Music</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Plays</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.youtubeMusic.plays}
                onChange={(e) => handleInputChange('youtubeMusic', 'plays', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Growth %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.youtubeMusic.growth}
                onChange={(e) => handleInputChange('youtubeMusic', 'growth', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Deezer */}
        <div className="p-4 border border-slate-200 rounded-md bg-white">
          <h4 className="font-medium text-blue-600 mb-3">Deezer</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Plays</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.deezer.plays}
                onChange={(e) => handleInputChange('deezer', 'plays', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Growth %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={analyticsData.deezer.growth}
                onChange={(e) => handleInputChange('deezer', 'growth', e.target.value)}
              />
            </div>
          </div>
        </div>
        
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
