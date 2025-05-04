import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Play } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';

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
  title: string;
  plays: number;
  growth: number;
}

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
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
  
  // Top tracks data (would come from backend in a real app)
  const [topTracks, setTopTracks] = useState<TrackData[]>([
    { title: 'Summer Nights', plays: 542, growth: 8.3 },
    { title: 'Midnight Drive', plays: 423, growth: 12.7 },
    { title: 'City Lights', plays: 387, growth: -2.1 },
    { title: 'Ocean Waves', plays: 356, growth: 5.4 },
    { title: 'Mountain High', plays: 298, growth: 3.2 }
  ]);

  useEffect(() => {
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

        const userId = session.user.id;
        
        // Get user's profile information
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();

        if (profileData) {
          setUserProfile({ name: profileData.full_name });
        }

        // Fetch analytics data from platform_analytics table
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('platform_analytics')
          .select('*')
          .single();
          
        if (analyticsData && !analyticsError) {
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
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const platformCards = [
    { name: 'Spotify', icon: <BarChart3 className="h-5 w-5 text-green-600" />, color: 'bg-green-100', textColor: 'text-green-600', data: platformData.spotify },
    { name: 'Apple Music', icon: <BarChart3 className="h-5 w-5 text-red-600" />, color: 'bg-red-100', textColor: 'text-red-600', data: platformData.appleMusic },
    { name: 'YouTube Music', icon: <BarChart3 className="h-5 w-5 text-purple-600" />, color: 'bg-purple-100', textColor: 'text-purple-600', data: platformData.youtubeMusic },
    { name: 'Deezer', icon: <BarChart3 className="h-5 w-5 text-blue-600" />, color: 'bg-blue-100', textColor: 'text-blue-600', data: platformData.deezer },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-6">Analytics Dashboard</h1>
          <p className="text-slate-600 mb-8">Track your music performance across platforms.</p>

          {/* Platform stats */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Platform Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {platformCards.map((platform, index) => (
              <AnimatedCard key={platform.name} delay={100 + (index * 50)}>
                <div className="glass-card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center`}>
                      {platform.icon}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                      platform.data.growth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {platform.data.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(platform.data.growth)}%
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-semibold text-slate-900">{platform.data.plays.toLocaleString()}</h3>
                  <p className="text-sm text-slate-500 mt-1">{platform.name} Plays</p>
                </div>
              </AnimatedCard>
            ))}
          </div>

          {/* Top Tracks */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Top Tracks</h2>
          <div className="glass-panel overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Track</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Plays</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topTracks.map((track, index) => (
                    <tr key={track.title} className={index < topTracks.length - 1 ? "border-b border-slate-100" : ""}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Play className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{track.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{track.plays.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          track.growth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {track.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(track.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Geographic distribution - Placeholder */}
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Listener Geography</h2>
          <AnimatedCard className="mb-8">
            <div className="glass-panel p-6 text-center py-16">
              <p className="text-slate-500">Geographic analytics will be available soon.</p>
            </div>
          </AnimatedCard>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Analytics;
