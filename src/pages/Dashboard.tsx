
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Music, TrendingUp, DollarSign, Users, Upload, Eye, BarChart3, Wallet, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import DashboardStats from '../components/DashboardStats';
import ReleaseCard from '../components/ReleaseCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { fetchUserStats } from '../services/releaseService';
import { useSubscriptionCheck } from '../hooks/useSubscriptionCheck';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { hasAccess, loading: subscriptionLoading, isAdmin, subscribed } = useSubscriptionCheck();
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalReleases: 0,
    activeReleases: 0,
    totalPlays: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    
    loadData(user.id);
  }, [user, authLoading]);

  const loadData = async (userId: string) => {
    try {
      await Promise.all([
        loadReleases(userId),
        loadUserRole(userId),
        loadStats(userId)
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load your dashboard data. Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReleases = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          *,
          artists(name, email)
        `)
        .eq('artist_id', userId)
        .order('release_date', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error loading releases:', error);
        return;
      }

      // Map releases with proper artist name and status
      const mappedReleases = data?.map(release => ({
        ...release,
        artist_name: release.artists?.name || 'Unknown Artist',
        status: release.status?.toLowerCase() || 'pending'
      })) || [];

      setReleases(mappedReleases);
    } catch (error) {
      console.error('Error loading releases:', error);
    }
  };

  const loadUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user role:', error);
        return;
      }

      setUserRole(data?.role || 'user');
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      const userStats = await fetchUserStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  if (loading || subscriptionLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAccess()) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Subscription Required</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                You need an active subscription to access the dashboard and its features. Please contact support or upgrade your account.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Contact Support</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                  Welcome back, {user?.email?.split('@')[0] || 'Artist'}!
                </h1>
                <p className="text-muted-foreground text-lg">
                  Manage your music distribution and track your performance
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Badge variant="destructive">Admin Access</Badge>
                )}
                {subscribed && (
                  <Badge variant="secondary">Subscribed</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <AnimatedCard>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Get started with your music distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild className="flex-1" size="lg">
                      <Link to="/release-form" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Submit New Release
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1" size="lg">
                      <Link to="/releases" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View All Releases
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1" size="lg">
                      <Link to="/analytics" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        View Analytics
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>

          {/* Stats */}
          <DashboardStats
            totalReleases={stats.totalReleases}
            activeReleases={stats.activeReleases}
            totalPlays={stats.totalPlays}
            totalEarnings={stats.totalEarnings}
            loading={loading}
          />

          {/* Recent Releases */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-semibold text-foreground">
                Recent Releases
              </h2>
              <Button asChild variant="outline">
                <Link to="/releases">View All</Link>
              </Button>
            </div>
            
            {releases.length === 0 ? (
              <AnimatedCard>
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No releases yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start your music distribution journey by submitting your first release.
                    </p>
                    <Button asChild size="lg">
                      <Link to="/release-form" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Submit Your First Release
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {releases.map((release, index) => (
                  <AnimatedCard key={release.id} delay={index * 100}>
                    <ReleaseCard
                      id={release.id}
                      title={release.title}
                      artist={release.artist_name || 'Unknown Artist'}
                      coverArt={release.cover_art_url}
                      status={release.status}
                      releaseDate={release.release_date}
                      streamingLinks={release.platforms || []}
                      upc={release.upc}
                      isrc={release.isrc}
                    />
                  </AnimatedCard>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCard delay={100}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/analytics">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your performance across all platforms
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={200}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/earnings">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Earnings</h3>
                    <p className="text-sm text-muted-foreground">
                      View your earnings and request withdrawals
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={300}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/team">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Team</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage team access and permissions
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={400}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to="/help">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Help Center</h3>
                    <p className="text-sm text-muted-foreground">
                      Get support and learn how to use the platform
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
