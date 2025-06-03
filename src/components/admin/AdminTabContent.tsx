
import React from 'react';
import ReleasesTab from './ReleasesTab';
import WithdrawalsTab from './WithdrawalsTab';
import ArtistsTab from './ArtistsTab';
import ArtistsEarningsTab from './ArtistsEarningsTab';
import AdminAnalyticsEditor from '../AdminAnalyticsEditor';
import TakeDownRequestsTab from '../TakeDownRequestsTab';
import { Release, Withdrawal, Artist } from '@/services/adminService';

interface AdminTabContentProps {
  activeTab: string;
  releases: Release[];
  withdrawals: Withdrawal[];
  artists: Artist[];
  artistsEarnings: any[];
  loading: boolean;
  onReleaseUpdate: (id: string, status: string, updatedData?: any) => void;
  onWithdrawalUpdate: (id: string, status: string, updatedData?: any) => void;
  onArtistUpdate: (id: string, status: string, updatedData?: any) => void;
  onRefreshData: () => void;
}

const AdminTabContent: React.FC<AdminTabContentProps> = ({
  activeTab,
  releases,
  withdrawals,
  artists,
  artistsEarnings,
  loading,
  onReleaseUpdate,
  onWithdrawalUpdate,
  onArtistUpdate,
  onRefreshData
}) => {
  switch (activeTab) {
    case 'releases':
      return (
        <ReleasesTab 
          releases={releases} 
          loading={loading}
          onReleaseUpdate={onReleaseUpdate} 
        />
      );
    case 'withdrawals':
      return (
        <WithdrawalsTab 
          withdrawals={withdrawals} 
          loading={loading}
          onWithdrawalUpdate={onWithdrawalUpdate} 
        />
      );
    case 'artists':
      return (
        <ArtistsTab 
          artists={artists} 
          loading={loading}
          onArtistUpdate={onArtistUpdate} 
        />
      );
    case 'earnings':
      return (
        <ArtistsEarningsTab 
          artistsEarnings={artistsEarnings} 
          loading={loading}
          onArtistUpdate={onRefreshData}
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

export default AdminTabContent;
