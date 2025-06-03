
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import DashboardStats from '@/components/admin/DashboardStats';
import AdminTabNavigation from '@/components/admin/AdminTabNavigation';
import AdminTabContent from '@/components/admin/AdminTabContent';
import { useAdminData } from '@/hooks/useAdminData';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('releases');
  
  const {
    releases,
    withdrawals,
    artists,
    artistsEarnings,
    loading,
    takeDownRequestsCount,
    handleReleaseUpdate,
    handleWithdrawalUpdate,
    handleArtistUpdate,
    fetchDashboardData
  } = useAdminData();
  
  // Calculate total earnings from all artists
  const totalArtistEarnings = artistsEarnings.reduce((total, artist) => {
    return total + (artist.total_earnings || 0);
  }, 0);
  
  // Calculate total pending withdrawals amount
  const pendingWithdrawalsAmount = withdrawals
    .filter(w => w.status === 'PENDING')
    .reduce((total, w) => total + w.amount, 0);

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
            
            <DashboardStats 
              releasesCount={releases.length}
              artistsCount={artists.length}
              pendingWithdrawalsCount={withdrawals.filter(w => w.status === 'PENDING').length}
              takeDownRequestsCount={takeDownRequestsCount}
              totalArtistEarnings={totalArtistEarnings}
              pendingWithdrawalsAmount={pendingWithdrawalsAmount}
            />
            
            <AdminTabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              takeDownRequestsCount={takeDownRequestsCount}
            />
            
            <div className="glass-panel p-6">
              <AdminTabContent
                activeTab={activeTab}
                releases={releases}
                withdrawals={withdrawals}
                artists={artists}
                artistsEarnings={artistsEarnings}
                loading={loading}
                onReleaseUpdate={handleReleaseUpdate}
                onWithdrawalUpdate={handleWithdrawalUpdate}
                onArtistUpdate={handleArtistUpdate}
                onRefreshData={fetchDashboardData}
              />
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
