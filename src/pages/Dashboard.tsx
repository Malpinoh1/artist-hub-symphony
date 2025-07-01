
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Music, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Plus,
  Activity,
  Calendar,
  Download
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MarketingOptInBanner from '../components/MarketingOptInBanner';
import DashboardStats from '../components/DashboardStats';
import AnimatedCard from '../components/AnimatedCard';
import ReleaseCard from '../components/ReleaseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { fetchUserReleases, fetchUserStats } from '../services/releaseService';
import type { Release } from '../services/releaseService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [stats, setStats] = useState({
    totalReleases: 0,
    activeReleases: 0,
    totalPlays: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Use the proper service functions
      const userReleases = await fetchUserReleases(session.user.id);
      const userStats = await fetchUserStats(session.user.id);
      
      setReleases(userReleases);
      setStats(userStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (releaseId: string, title: string, artist: string) => {
    try {
      // Get audio file URL from the release
      const { data, error } = await supabase
        .from('releases')
        .select('audio_file_url')
        .eq('id', releaseId)
        .single();
        
      if (error || !data.audio_file_url) {
        toast({
          title: "Error",
          description: "No audio file available for download",
          variant: "destructive"
        });
        return;
      }
      
      // Create a temporary anchor to download the file
      const link = document.createElement('a');
      link.href = data.audio_file_url;
      link.download = `${title} - ${artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Download started"
      });
    } catch (error) {
      console.error('Error downloading assets:', error);
      toast({
        title: "Error",
        description: "Failed to download assets",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <MarketingOptInBanner />
      <Navbar />
      
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.full_name || user?.email}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your music distribution
            </p>
          </div>

          <DashboardStats 
            totalReleases={stats.totalReleases}
            activeReleases={stats.activeReleases}
            totalPlays={stats.totalPlays}
            totalEarnings={stats.totalEarnings}
            loading={loading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AnimatedCard>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="w-5 h-5" />
                        Your Releases
                      </CardTitle>
                      <CardDescription>
                        Manage and track your music releases
                      </CardDescription>
                    </div>
                    <Button onClick={() => navigate('/release/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Release
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {releases.length === 0 ? (
                      <div className="text-center py-8">
                        <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No releases yet
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Start your music distribution journey by uploading your first release
                        </p>
                        <Button onClick={() => navigate('/release/new')}>
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Your First Release
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {releases.slice(0, 3).map((release) => (
                          <ReleaseCard
                            key={release.id}
                            id={release.id}
                            title={release.title}
                            artist={release.artist}
                            coverArt={release.coverArt}
                            status={release.status}
                            releaseDate={release.releaseDate}
                            streamingLinks={release.streamingLinks}
                            upc={release.upc}
                            isrc={release.isrc}
                          />
                        ))}
                        {releases.length > 3 && (
                          <div className="text-center pt-4">
                            <Button variant="outline" onClick={() => navigate('/releases')}>
                              View All Releases ({releases.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            <div className="space-y-6">
              <AnimatedCard>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/earnings')}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      View Earnings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/analytics')}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/settings')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>

              <AnimatedCard>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Account created
                      </div>
                      {releases.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Latest release uploaded
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
