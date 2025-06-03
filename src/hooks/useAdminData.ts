
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  fetchAdminReleases,
  fetchAdminWithdrawals,
  fetchAdminArtists,
  fetchTakeDownRequestsCount,
  fetchArtistsEarningSummary
} from '../services/adminService';

export const useAdminData = () => {
  const [releases, setReleases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistsEarnings, setArtistsEarnings] = useState([]);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleReleaseUpdate = (id: string, status: string, updatedData = null) => {
    if (updatedData) {
      setReleases(prev => prev.map(release => 
        release.id === id ? updatedData : release
      ));
    } else {
      setReleases(prev => prev.map(release => 
        release.id === id ? { ...release, status } : release
      ));
    }
  };
  
  const handleWithdrawalUpdate = (id: string, status: string, updatedData = null) => {
    if (updatedData) {
      setWithdrawals(prev => prev.map(withdrawal => 
        withdrawal.id === id ? updatedData : withdrawal
      ));
    } else {
      setWithdrawals(prev => prev.map(withdrawal => 
        withdrawal.id === id ? { 
          ...withdrawal, 
          status,
          processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
        } : withdrawal
      ));
    }
  };
  
  const handleArtistUpdate = (id: string, status: string, updatedData = null) => {
    if (updatedData) {
      setArtists(prev => prev.map(artist => 
        artist.id === id ? updatedData : artist
      ));
    } else {
      setArtists(prev => prev.map(artist => 
        artist.id === id ? { ...artist, status } : artist
      ));
    }
  };

  return {
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
  };
};
