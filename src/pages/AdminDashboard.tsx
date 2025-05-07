
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
  fetchTakeDownRequestsCount,
  fetchArtistsEarningSummary
} from '../services/adminService';
import ReleasesTab from '@/components/admin/ReleasesTab';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import ArtistsTab from '@/components/admin/ArtistsTab';
import DashboardStats from '@/components/admin/DashboardStats';
import AdminNav from '@/components/admin/AdminNav';
import ArtistsEarningsTab from '@/components/admin/ArtistsEarningsTab';

const AdminDashboard = () => {
  const [releases, setReleases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistsEarnings, setArtistsEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('releases');
  const [loading, setLoading] = useState(true);
  const [takeDownRequestsCount, setTakeDownRequestsCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [releasesData, withdrawalsData, artistsData, takeDownCount, artistsEarningsData] = await Promise.all([
          fetchAdminReleases(),
          fetchAdminWithdrawals(),
          fetchAdminArtists(),
          fetchTakeDownRequestsCount(),
          fetchArtistsEarningSummary()
        ]);
        
        setReleases(releasesData);
        setWithdrawals(withdrawalsData);
        setArtists(artistsData);
        setArtistsEarnings(artistsEarningsData);
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
  const handleReleaseUpdate = (id, status) => {
    setReleases(prev => {
      const updatedReleases = prev.map(release => 
        release.id === id ? { ...release, status } : release
      );
      return updatedReleases;
    });
  };
  
  // Handle withdrawal update
  const handleWithdrawalUpdate = (id, status) => {
    setWithdrawals(prev => prev.map(withdrawal => 
      withdrawal.id === id ? { 
        ...withdrawal, 
        status,
        processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
      } : withdrawal
    ));
  };
  
  // Handle artist update
  const handleArtistUpdate = (id, status) => {
    setArtists(prev => prev.map(artist => 
      artist.id === id ? { ...artist, status } : artist
    ));
  };
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Calculate total earnings from all artists
  const totalArtistEarnings = artistsEarnings.reduce((total, artist) => {
    return total + (artist.total_earnings || 0);
  }, 0);
  
  // Calculate total pending withdrawals amount
  const pendingWithdrawalsAmount = withdrawals
    .filter(w => w.status === 'PENDING')
    .reduce((total, w) => total + w.amount, 0);
  
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
      case 'earnings':
        return (
          <ArtistsEarningsTab 
            artistsEarnings={artistsEarnings} 
            loading={loading}
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
              totalArtistEarnings={totalArtistEarnings}
              pendingWithdrawalsAmount={pendingWithdrawalsAmount}
            />
            
            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 mb-6">
              <div className="flex overflow-x-auto space-x-1">
                <button 
                  onClick={() => handleTabChange('releases')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'releases'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  Releases
                </button>
                
                <button 
                  onClick={() => handleTabChange('withdrawals')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'withdrawals'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  Withdrawals
                </button>
                
                <button 
                  onClick={() => handleTabChange('artists')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'artists'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  Artists
                </button>
                
                <button 
                  onClick={() => handleTabChange('earnings')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'earnings'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  Earnings Summary
                </button>
                
                <button 
                  onClick={() => handleTabChange('analytics')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  Analytics
                </button>
                
                <button 
                  onClick={() => handleTabChange('takedown')}
                  className={`px-4 py-2 border-b-2 whitespace-nowrap flex items-center ${
                    activeTab === 'takedown'
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent hover:text-blue-500'
                  }`}
                >
                  <span>Take Down Requests</span>
                  {takeDownRequestsCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                      {takeDownRequestsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
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
