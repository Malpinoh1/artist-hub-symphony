
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Play, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import { fetchPlatformAnalytics } from '../services/statisticsService';
import { Button } from '@/components/ui/button';
import { useToast } from '../hooks/use-toast';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import SubscriptionGate from '../components/SubscriptionGate';

// Define interface for platform analytics data
interface PlatformAnalyticsData {
  spotify_plays: number;
  spotify_growth: number;
  apple_music_plays: number;
  apple_music_growth: number;
  youtube_music_plays: number;
  youtube_music_growth: number;
  deezer_plays: number;
  deezer_growth: number;
}

interface TrackData {
  id: string;
  title: string;
  total_streams: number;
  spotify_streams: number;
  apple_music_streams: number;
  youtube_music_streams: number;
  other_streams: number;
  growth?: number;
  release_date?: string;
}

const AnalyticsContent = () => {
  const { toast } = useToast();
  const { getEffectiveAccountId, isWebsiteAdmin } = useTeamPermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
  const [artistData, setArtistData] = useState<any>(null);
  const [platformData, setPlatformData] = useState<{
    spotify: { plays: number, growth: number },
    appleMusic: { plays: number, growth: number },
    youtubeMusic: { plays: number, growth: number },
    deezer: { plays: number, growth: number }
  }>({
    spotify: { plays: 0, growth: 0 },
    appleMusic: { plays: 0, growth: 0 },
    youtubeMusic: { plays: 0, growth: 0 },
    deezer: { plays: 0, growth: 0 }
  });
  
  const [topTracks, setTopTracks] = useState<TrackData[]>([]);

  const fetchTopTracks = async (artistId: string) => {
    try {
      console.log(`Fetching tracks for artist ${artistId}`);
      
      // Get artist's releases with their performance statistics
      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select(`
          id,
          title,
          release_date,
          performance_statistics (
            total_streams,
            spotify_streams,
            apple_music_streams,
            youtube_music_streams,
            other_streams,
            date
          )
        `)
        .eq('artist_id', artistId)
        .eq('status', 'Approved')
        .order('release_date', { ascending: false });
        
      if (releasesError) {
        console.error("Error fetching releases:", releasesError);
        throw releasesError;
      }
      
      console.log("Fetched releases with stats:", releases);
      
      if (releases && releases.length > 0) {
        // Transform releases into track data with performance statistics
        const tracksWithStats = releases
          .filter(release => release.performance_statistics && release.performance_statistics.length > 0)
          .map(release => {
            // Get the most recent statistics for each release
            const latestStats = release.performance_statistics
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            return {
              id: release.id,
              title: release.title,
              total_streams: latestStats.total_streams || 0,
              spotify_streams: latestStats.spotify_streams || 0,
              apple_music_streams: latestStats.apple_music_streams || 0,
              youtube_music_streams: latestStats.youtube_music_streams || 0,
              other_streams: latestStats.other_streams || 0,
              release_date: release.release_date,
              growth: Math.random() * 20 - 5 // Random growth for now, could be calculated from historical data
            };
          })
          .sort((a, b) => b.total_streams - a.total_streams)
          .slice(0, 5); // Top 5 tracks
          
        console.log("Processed tracks with stats:", tracksWithStats);
        setTopTracks(tracksWithStats);
      } else {
        console.log("No releases with performance statistics found");
        setTopTracks([]);
      }
    } catch (error) {
      console.error("Error fetching top tracks:", error);
      setTopTracks([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      // Use effective account ID (respects team context)
      const effectiveAccountId = getEffectiveAccountId() || session.user.id;
      
      // Get user's profile information
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileData) {
        setUserProfile({ name: profileData.full_name });
      }

      // Get artist data using effective account ID
      const { data: artistInfo } = await supabase
        .from('artists')
        .select('*')
        .eq('id', effectiveAccountId)
        .maybeSingle();

      if (artistInfo) {
        setArtistData(artistInfo);
        console.log("Found artist data:", artistInfo);
        
        // Fetch top tracks for this artist
        await fetchTopTracks(artistInfo.id);
      } else {
        console.log("No artist data found");
        setTopTracks([]);
      }

      // Fetch analytics data using the service function
      const analyticsData = await fetchPlatformAnalytics();
          
      if (analyticsData) {
        setPlatformData({
          spotify: { 
            plays: analyticsData.spotify_plays || 0, 
            growth: analyticsData.spotify_growth || 0 
          },
          appleMusic: { 
            plays: analyticsData.apple_music_plays || 0, 
            growth: analyticsData.apple_music_growth || 0 
          },
          youtubeMusic: { 
            plays: analyticsData.youtube_music_plays || 0, 
            growth: analyticsData.youtube_music_growth || 0 
          },
          deezer: { 
            plays: analyticsData.deezer_plays || 0, 
            growth: analyticsData.deezer_growth || 0 
          }
        });
      } else {
        console.log("Using default analytics data");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast({
        title: "Failed to load analytics",
        description: "There was an error fetching analytics data.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({
      title: "Analytics refreshed",
      description: "The latest analytics data has been loaded."
    });
  };

  const platformCards = [
    { name: 'Spotify', icon: <BarChart3 className="h-5 w-5 text-green-600" />, color: 'bg-green-100', textColor: 'text-green-600', data: platformData.spotify },
    { name: 'Apple Music', icon: <BarChart3 className="h-5 w-5 text-red-600" />, color: 'bg-red-100', textColor: 'text-red-600', data: platformData.appleMusic },
    { name: 'YouTube Music', icon: <BarChart3 className="h-5 w-5 text-purple-600" />, color: 'bg-purple-100', textColor: 'text-purple-600', data: platformData.youtubeMusic },
    { name: 'Deezer', icon: <BarChart3 className="h-5 w-5 text-blue-600" />, color: 'bg-blue-100', textColor: 'text-blue-600', data: platformData.deezer },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 dark:text-white mb-0">Analytics Dashboard</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1"
            >
              {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Track your music performance across platforms.</p>

          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-slate-600 dark:text-slate-400">Loading analytics data...</p>
            </div>
          ) : (
            <>
              {/* Platform stats */}
              <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white mb-4">Platform Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                {platformCards.map((platform, index) => (
                  <AnimatedCard key={platform.name} delay={100 + (index * 50)}>
                    <div className="glass-card p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-full ${platform.color} dark:bg-opacity-20 flex items-center justify-center`}>
                          {platform.icon}
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                          platform.data.growth > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {platform.data.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(platform.data.growth)}%
                        </span>
                      </div>
                      <h3 className="text-2xl font-display font-semibold text-slate-900 dark:text-white">{platform.data.plays.toLocaleString()}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{platform.name} Plays</p>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Top Tracks */}
              <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white mb-4">Top Tracks</h2>
              <div className="glass-panel overflow-hidden mb-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="overflow-x-auto">
                  {topTracks.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-500 dark:text-slate-400">Track</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-500 dark:text-slate-400">Total Streams</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-500 dark:text-slate-400">Spotify</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-500 dark:text-slate-400">Apple Music</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-500 dark:text-slate-400">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTracks.map((track, index) => (
                          <tr key={track.id} className={index < topTracks.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="font-medium dark:text-white">{track.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{track.total_streams.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{track.spotify_streams.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{track.apple_music_streams.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                (track.growth || 0) > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {(track.growth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(track.growth || 0).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400">
                        {artistData ? "No tracks with performance statistics found. Upload releases and add performance data to see analytics." : "No artist profile found. Please complete your artist registration."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Geographic distribution - Placeholder */}
              <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-white mb-4">Listener Geography</h2>
              <AnimatedCard className="mb-8">
                <div className="glass-panel p-6 text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <p className="text-slate-500 dark:text-slate-400">Geographic analytics will be available soon.</p>
                </div>
              </AnimatedCard>
            </>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

// Wrap with subscription gate
const Analytics = () => {
  return (
    <SubscriptionGate fallbackMessage="You need an active subscription to access analytics.">
      <AnalyticsContent />
    </SubscriptionGate>
  );
};

export default Analytics;
