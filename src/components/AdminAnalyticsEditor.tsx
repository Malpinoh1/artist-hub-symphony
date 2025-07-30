
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, AlertCircle, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { fetchPlatformAnalytics, updatePlatformAnalytics, initializePlatformAnalytics } from '../services/statisticsService';
import { supabase } from '../integrations/supabase/client';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [isWebsiteAdmin, setIsWebsiteAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
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
      console.log("Loading analytics data...");
      
      const data = await fetchPlatformAnalytics();
      
      if (data) {
        setAnalyticsData({
          id: 'id' in data ? data.id : undefined,
          spotify_plays: data.spotify_plays || 0,
          spotify_growth: data.spotify_growth || 0,
          apple_music_plays: data.apple_music_plays || 0, 
          apple_music_growth: data.apple_music_growth || 0,
          youtube_music_plays: data.youtube_music_plays || 0, 
          youtube_music_growth: data.youtube_music_growth || 0,
          deezer_plays: data.deezer_plays || 0, 
          deezer_growth: data.deezer_growth || 0,
          last_updated: 'last_updated' in data ? data.last_updated : undefined
        });
        console.log("Analytics data loaded successfully:", data);
      } else {
        console.log("No analytics data found");
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
  
  // Initialize analytics data if it doesn't exist
  const handleInitializeAnalytics = async () => {
    try {
      setIsInitializing(true);
      console.log("Initializing analytics data...");
      
      const result = await initializePlatformAnalytics();
      
      if (result.success) {
        toast({
          title: 'Analytics initialized',
          description: 'Platform analytics data has been created successfully',
        });
        await loadAnalyticsData();
      } else {
        throw new Error("Failed to initialize analytics");
      }
    } catch (error) {
      console.error("Error initializing analytics:", error);
      toast({
        title: 'Initialization failed',
        description: 'Could not initialize analytics data',
        variant: 'destructive'
      });
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Check user permissions and load data on component mount
  useEffect(() => {
    checkUserPermissions();
  }, []);

  const checkUserPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCheckingPermissions(false);
        return;
      }

      // Check if user has admin role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      const isAdmin = userRole?.role === 'admin';
      setIsWebsiteAdmin(isAdmin);
      
      if (isAdmin) {
        await loadAnalyticsData();
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
    } finally {
      setCheckingPermissions(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    setAnalyticsData(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };
  
  const handleSaveAnalytics = async () => {
    try {
      setLoading(true);
      console.log("Saving analytics data...");
      
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
        await loadAnalyticsData(); // Refresh data after update
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
  
  // Show loading while checking permissions
  if (checkingPermissions) {
    return (
      <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600 dark:text-slate-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not website admin
  if (!isWebsiteAdmin) {
    return (
      <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="py-20 text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Access Restricted</h3>
          <p className="text-slate-600 dark:text-slate-400">
            Only website administrators can edit platform analytics.
            <br />
            Contact your system administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-semibold dark:text-white">Platform Analytics Management</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Website admin control panel for managing streaming analytics data
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            disabled={isFetching}
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleInitializeAnalytics}
            disabled={isInitializing}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm disabled:bg-blue-400"
          >
            {isInitializing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Initialize
          </button>
        </div>
      </div>
      
      {isFetching ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600 dark:text-slate-400">Loading analytics data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {!analyticsData.id && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">No Analytics Data Found</h4>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Click "Initialize" to create the platform analytics data structure.
              </p>
            </div>
          )}
          
          {platforms.map((platform) => (
            <div 
              key={platform.id}
              className={`p-4 border border-slate-200 dark:border-slate-700 rounded-md ${platform.bgColor}`}
            >
              <h4 className={`font-medium ${platform.color} mb-3`}>{platform.name}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Total Plays</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                    value={analyticsData[platform.playsField as keyof PlatformAnalyticsData]}
                    onChange={(e) => handleInputChange(platform.playsField, e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Growth Rate (%)</label>
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
          
          {analyticsData.last_updated && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: {new Date(analyticsData.last_updated).toLocaleString()}
            </div>
          )}
          
          <button
            onClick={handleSaveAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center disabled:bg-blue-400 dark:disabled:bg-blue-800"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Analytics Data
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsEditor;
