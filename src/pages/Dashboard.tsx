
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  MusicIcon, 
  UploadIcon, 
  DollarSignIcon, 
  Music, 
  AlertCircle,
  BarChart3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DashboardStats from '../components/DashboardStats';
import ReleaseCard from '../components/ReleaseCard';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import { Release, fetchUserReleases, fetchUserStats } from '../services/releaseService';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<Release[]>([]);
  const [stats, setStats] = useState({
    totalReleases: 0,
    activeReleases: 0,
    totalPlays: 0,
    totalEarnings: 0
  });
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);

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

        // Get releases
        const userReleases = await fetchUserReleases(userId);
        setReleases(userReleases);

        // Get stats
        const userStats = await fetchUserStats(userId);
        setStats(userStats);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Only show at most 4 releases on the dashboard
  const displayedReleases = releases.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        {/* Hero Section */}
        <section className="bg-white border-b border-slate-100">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <AnimatedCard className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900">Welcome, {userProfile?.name || 'Artist'}</h1>
                <p className="mt-2 text-slate-600">Manage your music and track your growth.</p>
              </div>
              <Link to="/new-release" className="btn-primary">
                <span className="flex items-center gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Submit New Release
                </span>
              </Link>
            </AnimatedCard>
          </div>
        </section>
        
        {/* Stats Section */}
        <section className="container mx-auto px-4 py-8">
          <AnimatedCard delay={100}>
            <DashboardStats 
              totalReleases={stats.totalReleases}
              activeReleases={stats.activeReleases}
              totalPlays={stats.totalPlays}
              totalEarnings={stats.totalEarnings}
              loading={loading}
            />
          </AnimatedCard>
        </section>
        
        {/* Recent Releases Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-semibold text-slate-900">Recent Releases</h2>
            <Link to="/releases" className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, index) => (
                <AnimatedCard key={`skeleton-${index}`} delay={150 + index * 50}>
                  <div className="glass-card">
                    <div className="aspect-square bg-slate-200 animate-pulse" />
                    <div className="p-4">
                      <div className="h-5 bg-slate-200 animate-pulse rounded-md mb-2" />
                      <div className="h-4 bg-slate-200 animate-pulse rounded-md w-3/4" />
                    </div>
                  </div>
                </AnimatedCard>
              ))
            ) : displayedReleases.length > 0 ? (
              displayedReleases.map((release, index) => (
                <AnimatedCard key={release.id} delay={150 + index * 50}>
                  <ReleaseCard {...release} />
                </AnimatedCard>
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-slate-600">You don't have any releases yet.</p>
                <Link to="/new-release" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">
                  Create your first release
                </Link>
              </div>
            )}
          </div>
        </section>
        
        {/* Quick Actions */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-display font-semibold text-slate-900 mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard delay={300}>
              <Link to="/new-release" className="glass-card p-6 flex flex-col items-center text-center hover:bg-blue-50/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <MusicIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Submit New Release</h3>
                <p className="text-sm text-slate-600 mt-2">Upload your music and submit it for distribution.</p>
              </Link>
            </AnimatedCard>
            
            <AnimatedCard delay={350}>
              <Link to="/earnings" className="glass-card p-6 flex flex-col items-center text-center hover:bg-blue-50/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <DollarSignIcon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Withdraw Earnings</h3>
                <p className="text-sm text-slate-600 mt-2">Request a withdrawal of your available earnings.</p>
              </Link>
            </AnimatedCard>
            
            <AnimatedCard delay={400}>
              <Link to="/analytics" className="glass-card p-6 flex flex-col items-center text-center hover:bg-blue-50/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">View Analytics</h3>
                <p className="text-sm text-slate-600 mt-2">Track your music performance across platforms.</p>
              </Link>
            </AnimatedCard>
          </div>
        </section>
        
        {/* Notification Section */}
        <section className="container mx-auto px-4 py-8">
          <AnimatedCard delay={450}>
            <div className="glass-panel p-6 flex flex-col md:flex-row items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-lg font-medium text-slate-900">Complete Your Profile</h3>
                <p className="text-slate-600 mt-1">Add your payment information to ensure you receive your earnings on time.</p>
              </div>
              <Link to="/settings" className="btn-secondary">
                Complete Profile
              </Link>
            </div>
          </AnimatedCard>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
