
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface Release {
  id: string;
  title: string;
  artist: string;
  cover_art_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested';
  release_date?: string;
  upc?: string;
  isrc?: string;
  audio_file_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [releases, setReleases] = useState<Release[]>([]);
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

      // Fetch user releases
      const { data: releasesData } = await supabase
        .from('releases')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (releasesData) {
        setReleases(releasesData);
      }
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

  const approvedReleases = releases.filter(r => r.status === 'approved').length;
  const totalPlays = 0; // This would come from analytics data
  const totalEarnings = 0; // This would come from earnings data

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
            totalReleases={releases.length}
            activeReleases={approvedReleases}
            totalPlays={totalPlays}
            totalEarnings={totalEarnings}
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
                          <div key={release.id} className="glass-card overflow-hidden group">
                            <div className="relative aspect-square">
                              <img 
                                src={release.cover_art_url || '/placeholder.svg'} 
                                alt={release.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute top-3 right-3">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center ${
                                  release.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  release.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  release.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {release.status.charAt(0).toUpperCase() + release.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <h3 className="font-medium text-slate-900 truncate" title={release.title}>{release.title}</h3>
                              <p className="text-sm text-slate-600 mt-1">{release.artist}</p>
                              
                              {(release.upc || release.isrc) && release.status === 'approved' && (
                                <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-500">
                                  {release.upc && (
                                    <div className="truncate" title={`UPC: ${release.upc}`}>
                                      <span className="font-medium">UPC:</span> {release.upc}
                                    </div>
                                  )}
                                  {release.isrc && (
                                    <div className="truncate" title={`ISRC: ${release.isrc}`}>
                                      <span className="font-medium">ISRC:</span> {release.isrc}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
                                <button 
                                  onClick={() => navigate(`/releases/${release.id}`)}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                                >
                                  View Details
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                
                                {release.status === 'approved' && (
                                  <button 
                                    onClick={() => handleDownload(release.id, release.title, release.artist)}
                                    title="Download Assets"
                                    className="text-sm text-slate-500 hover:text-slate-700"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
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
