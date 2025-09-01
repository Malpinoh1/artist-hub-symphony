
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { toast } from 'sonner';
import AdminAnalyticsEditor from '../components/AdminAnalyticsEditor';
import TakeDownRequestsTab from '../components/TakeDownRequestsTab';
import SubscriptionManagement from '../components/admin/SubscriptionManagement';
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
import ArtistsEarningsTab from '@/components/admin/ArtistsEarningsTab';
import MarketingEmailsTab from '@/components/admin/MarketingEmailsTab';
import PlatformEarningsTab from '@/components/admin/PlatformEarningsTab';
import RoyaltyStatementsTab from '@/components/admin/RoyaltyStatementsTab';
import { SiteNoticesTab } from '@/components/admin/SiteNoticesTab';

const AdminDashboard = () => {
  const [releases, setReleases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistsEarnings, setArtistsEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('releases');
  const [loading, setLoading] = useState(true);
  const [takeDownRequestsCount, setTakeDownRequestsCount] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      const [releasesData, withdrawalsData, artistsData, takeDownCount, artistsEarningsData] = await Promise.all([
        fetchAdminReleases(),
        fetchAdminWithdrawals(),
        fetchAdminArtists(),
        fetchTakeDownRequestsCount(),
        fetchArtistsEarningSummary()
      ]);
      
      console.log('Fetched dashboard data:', {
        releases: releasesData?.length,
        withdrawals: withdrawalsData?.length,
        artists: artistsData?.length,
        takeDownCount,
        artistsEarnings: artistsEarningsData?.length
      });
      
      setReleases(releasesData || []);
      setWithdrawals(withdrawalsData || []);
      setArtists(artistsData || []);
      setArtistsEarnings(artistsEarningsData || []);
      setTakeDownRequestsCount(takeDownCount || 0);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Handle release update with proper data refresh
  const handleReleaseUpdate = (id, status, updatedData = null) => {
    console.log('AdminDashboard: handleReleaseUpdate called with:', { id, status, updatedData });
    
    if (updatedData) {
      setReleases(prev => {
        const newReleases = prev.map(release => 
          release.id === id ? { ...release, ...updatedData } : release
        );
        console.log('AdminDashboard: Updated releases array:', newReleases);
        return newReleases;
      });
    } else {
      // Fallback - just refresh all data
      console.log('AdminDashboard: No updated data provided, refreshing all data');
      fetchDashboardData();
    }
  };
  
  // Handle withdrawal update
  const handleWithdrawalUpdate = (id, status, updatedData = null) => {
    console.log('AdminDashboard: handleWithdrawalUpdate called with:', { id, status, updatedData });
    
    if (updatedData) {
      setWithdrawals(prev => prev.map(withdrawal => 
        withdrawal.id === id ? updatedData : withdrawal
      ));
    } else {
      fetchDashboardData();
    }
  };
  
  // Handle artist update
  const handleArtistUpdate = (id, status, updatedData = null) => {
    console.log('AdminDashboard: handleArtistUpdate called with:', { id, status, updatedData });
    
    if (updatedData) {
      setArtists(prev => prev.map(artist => 
        artist.id === id ? updatedData : artist
      ));
    } else {
      fetchDashboardData();
    }
  };

  // Handle refresh data
  const handleRefreshData = () => {
    console.log('AdminDashboard: Refreshing all data');
    fetchDashboardData();
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
            onArtistUpdate={handleRefreshData}
          />
        );
      case 'analytics':
        return <AdminAnalyticsEditor />;
      case 'subscriptions':
        return <SubscriptionManagement />;
      case 'takedown':
        return <TakeDownRequestsTab />;
      case 'marketing':
        return <MarketingEmailsTab />;
      case 'platform-earnings':
        return <PlatformEarningsTab onGenerateStatement={handleRefreshData} />;
      case 'royalty-statements':
        return <RoyaltyStatementsTab onStatementUpdate={handleRefreshData} />;
      case 'site-notices':
        return <SiteNoticesTab />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'releases', label: 'Releases' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'artists', label: 'Artists' },
    { id: 'earnings', label: 'Earnings Summary' },
    { id: 'platform-earnings', label: 'Platform Earnings' },
    { id: 'royalty-statements', label: 'Royalty Statements' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'marketing', label: 'Marketing Emails' },
    { id: 'site-notices', label: 'Site Notices' },
    { 
      id: 'takedown', 
      label: 'Take Down Requests',
      badge: takeDownRequestsCount > 0 ? takeDownRequestsCount : null
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold text-black">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your distribution platform</p>
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
            <div className="border-b border-gray-200 mb-6">
              <div className="flex overflow-x-auto space-x-1">
                {tabs.map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-2 border-b-2 whitespace-nowrap flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 font-medium'
                        : 'border-transparent hover:text-blue-500'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
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
