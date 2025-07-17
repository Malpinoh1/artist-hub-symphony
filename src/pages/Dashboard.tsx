
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
  Eye,
  BarChart3,
  Upload,
  Headphones
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

  const quickActions = [
    {
      icon: <Upload className="w-5 h-5" />,
      title: "Upload Release",
      description: "Distribute your music globally",
      action: () => navigate('/release/new'),
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Analytics",
      description: "View performance insights",
      action: () => navigate('/analytics'),
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: "Earnings",
      description: "Check your revenue",
      action: () => navigate('/earnings'),
      gradient: "from-yellow-500 to-orange-600"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Team Access",
      description: "Manage collaborators",
      action: () => navigate('/team'),
      gradient: "from-purple-500 to-pink-600"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      <MarketingOptInBanner />
      <Navbar />
      
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                  Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 👋
                </h1>
                <p className="text-muted-foreground text-lg">
                  Here's what's happening with your music distribution
                </p>
              </div>
              <Button 
                onClick={() => navigate('/release/new')}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Release
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <DashboardStats 
            totalReleases={stats.totalReleases}
            activeReleases={stats.activeReleases}
            totalPlays={stats.totalPlays}
            totalEarnings={stats.totalEarnings}
            loading={loading}
          />

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-display font-semibold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <AnimatedCard key={action.title} delay={index * 100}>
                  <Card 
                    className="glass-card cursor-pointer group hover:scale-105 transition-all duration-300 border-0 shadow-lg"
                    onClick={action.action}
                  >
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        {React.cloneElement(action.icon, { className: "w-5 h-5 text-white" })}
                      </div>
                      <h3 className="font-semibold mb-2">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Releases Section */}
            <div className="lg:col-span-2">
              <AnimatedCard>
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-6">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Music className="w-5 h-5 text-primary" />
                        Your Releases
                      </CardTitle>
                      <CardDescription className="text-base">
                        Manage and track your music releases
                      </CardDescription>
                    </div>
                    {releases.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/releases')}
                        className="hidden sm:flex"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View All
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {releases.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
                          <Music className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No releases yet
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                          Start your music distribution journey by uploading your first release
                        </p>
                        <Button 
                          onClick={() => navigate('/release/new')}
                          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Your First Release
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {releases.slice(0, 3).map((release, index) => (
                          <div key={release.id} className="animate-slideIn" style={{ animationDelay: `${index * 100}ms` }}>
                            <ReleaseCard
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
                          </div>
                        ))}
                        {releases.length > 3 && (
                          <div className="text-center pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => navigate('/releases')}
                              className="w-full sm:w-auto"
                            >
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <AnimatedCard delay={100}>
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-foreground">Account created</p>
                          <p className="text-muted-foreground text-xs">Welcome to MALPINOHdistro!</p>
                        </div>
                      </div>
                      {releases.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <p className="text-foreground">Latest release uploaded</p>
                            <p className="text-muted-foreground text-xs">{releases[0]?.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Platform Status */}
              <AnimatedCard delay={200}>
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-primary" />
                      Platform Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "Spotify", status: "operational" },
                        { name: "Apple Music", status: "operational" },
                        { name: "YouTube Music", status: "operational" },
                        { name: "Amazon Music", status: "operational" }
                      ].map((platform) => (
                        <div key={platform.name} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{platform.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground capitalize">{platform.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Help & Support */}
              <AnimatedCard delay={300}>
                <Card className="glass-card border-0 shadow-lg border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">Need Help?</CardTitle>
                    <CardDescription>
                      Get support from our team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-primary/20 hover:bg-primary/10"
                      onClick={() => navigate('/help')}
                    >
                      Help Center
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-primary/20 hover:bg-primary/10"
                      onClick={() => navigate('/contact')}
                    >
                      Contact Support
                    </Button>
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
