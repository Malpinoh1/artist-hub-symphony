
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavbar from '../components/MobileNavbar';
import Footer from '../components/Footer';
import MarketingOptInBanner from '../components/MarketingOptInBanner';
import MobileDashboard from '../components/MobileDashboard';
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
        <MobileNavbar />
        <div className="flex-grow flex items-center justify-center pt-20">
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
      <MobileNavbar />
      
      <main className="flex-grow pt-20 pb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h1>
            <p className="text-gray-600 text-sm">
              {profile?.full_name || user?.email}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Here's what's happening with your music
            </p>
          </div>

          <MobileDashboard 
            stats={stats}
            releases={releases}
            loading={loading}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
