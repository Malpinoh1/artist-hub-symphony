import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { toast } from 'sonner';
import AdminAnalyticsEditor from '../components/AdminAnalyticsEditor';
import TakeDownRequestsTab from '../components/TakeDownRequestsTab';
import {
  fetchAdminReleases,
  fetchAdminWithdrawals,
  fetchAdminArtists,
  fetchTakeDownRequestsCount
} from '../services/adminService';
import ReleasesTab from '@/components/admin/ReleasesTab';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import ArtistsTab from '@/components/admin/ArtistsTab';
import DashboardStats from '@/components/admin/DashboardStats';
import AdminNav from '@/components/admin/AdminNav';

const AdminDashboard = () => {
  const [releases, setReleases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeTab, setActiveTab] = useState('releases');
  const [loading, setLoading] = useState(true);
  const [takeDownRequestsCount, setTakeDownRequestsCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [releasesData, withdrawalsData, artistsData, takeDownCount] = await Promise.all([
          fetchAdminReleases(),
          fetchAdminWithdrawals(),
          fetchAdminArtists(),
          fetchTakeDownRequestsCount()
        ]);
        
        setReleases(releasesData);
        setWithdrawals(withdrawalsData);
        setArtists(artistsData);
        setTakeDownRequestsCount(takeDownCount);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Handle release update
  const handleReleaseUpdate = (id: string, status: string) => {
    setReleases(prev => prev.map(release => 
      release.id === id ? { ...release, status } : release
    ));
  };
  
  // Handle withdrawal update
  const handleWithdrawalUpdate = (id: string, status: string) => {
    setWithdrawals(prev => prev.map(withdrawal => 
      withdrawal.id === id ? { 
        ...withdrawal, 
        status,
        processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
      } : withdrawal
    ));
  };
  
  // Handle artist update
  const handleArtistUpdate = (id: string, status: string) => {
    setArtists(prev => prev.map(artist => 
      artist.id === id ? { ...artist, status } : artist
    ));
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Render active tab content
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'releases':
        return (
          <ReleasesTab 
            releases={releases} 
            loading={loading}
            onReleaseUpdate={handleReleaseUpdate} 
          />
        );
      case 'withdrawals':
        return (
          <WithdrawalsTab 
            withdrawals={withdrawals} 
            loading={loading}
            onWithdrawalUpdate={handleWithdrawalUpdate} 
          />
        );
      case 'artists':
        return (
          <ArtistsTab 
            artists={artists} 
            loading={loading}
            onArtistUpdate={handleArtistUpdate} 
          />
        );
      case 'analytics':
        return <AdminAnalyticsEditor />;
      case 'takedown':
        return <TakeDownRequestsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your distribution platform</p>
            </div>
            
            {/* Dashboard Stats */}
            <DashboardStats 
              releasesCount={releases.length}
              artistsCount={artists.length}
              pendingWithdrawalsCount={withdrawals.filter(w => w.status === 'PENDING').length}
              takeDownRequestsCount={takeDownRequestsCount}
            />
            
            {/* Tabs Navigation */}
            <AdminNav 
              activeTab={activeTab}
              takeDownRequestsCount={takeDownRequestsCount}
              onTabChange={handleTabChange}
            />
            
            {/* Tab Content */}
            <div className="glass-panel p-6">
              {renderActiveTabContent()}
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
