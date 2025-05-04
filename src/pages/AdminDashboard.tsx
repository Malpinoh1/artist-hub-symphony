
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  ChevronRight, 
  Clock, 
  RefreshCw,
  DollarSign,
  Users,
  Music,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Ban,
  BarChart3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import AdminAnalyticsEditor from '../components/AdminAnalyticsEditor';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [releases, setReleases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeTab, setActiveTab] = useState('releases');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch releases
        const { data: releasesData, error: releasesError } = await supabase
          .from('releases')
          .select(`
            id,
            title,
            cover_art_url,
            status,
            release_date,
            artists(id, name, email)
          `)
          .order('created_at', { ascending: false });
          
        if (releasesError) throw releasesError;
        setReleases(releasesData || []);
        
        // Fetch withdrawals
        const { data: withdrawalsData, error: withdrawalsError } = await supabase
          .from('withdrawals')
          .select(`
            id,
            amount,
            status,
            created_at,
            processed_at,
            account_name,
            account_number,
            bank_name,
            artists(id, name, email)
          `)
          .order('created_at', { ascending: false });
          
        if (withdrawalsError) throw withdrawalsError;
        setWithdrawals(withdrawalsData || []);
        
        // Fetch artists
        const { data: artistsData, error: artistsError } = await supabase
          .from('artists')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (artistsError) throw artistsError;
        setArtists(artistsData || []);
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: 'Error loading data',
          description: 'Failed to load admin dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  const handleReleaseAction = async (id, status) => {
    try {
      const { error } = await supabase
        .from('releases')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setReleases(prev => prev.map(release => 
        release.id === id ? { ...release, status } : release
      ));
      
      toast({
        title: 'Status updated',
        description: `Release status changed to ${status}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating release:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update release status',
        variant: 'destructive'
      });
    }
  };
  
  const handleWithdrawalAction = async (id, status) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status,
          processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setWithdrawals(prev => prev.map(withdrawal => 
        withdrawal.id === id ? { 
          ...withdrawal, 
          status,
          processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
        } : withdrawal
      ));
      
      toast({
        title: 'Status updated',
        description: `Withdrawal status changed to ${status}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update withdrawal status',
        variant: 'destructive'
      });
    }
  };
  
  const handleArtistStatusChange = async (id, status) => {
    try {
      const { error } = await supabase
        .from('artists')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setArtists(prev => prev.map(artist => 
        artist.id === id ? { ...artist, status } : artist
      ));
      
      toast({
        title: 'Status updated',
        description: `Artist status changed to ${status}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating artist status:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update artist status',
        variant: 'destructive'
      });
    }
  };
  
  // Render release management tab
  const renderReleasesTab = () => {
    if (loading) return <div className="py-8 text-center text-gray-500">Loading releases...</div>;
    
    if (releases.length === 0) {
      return (
        <div className="py-12 text-center">
          <Music className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-xl font-semibold text-gray-900">No releases found</h3>
          <p className="text-gray-500">There are no music releases in the system yet.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Artist</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Release Date</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {releases.map(release => (
              <tr key={release.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-gray-900 flex items-center">
                  {release.cover_art_url && (
                    <img 
                      src={release.cover_art_url} 
                      alt={release.title}
                      className="w-10 h-10 mr-3 object-cover rounded-sm"
                    />
                  )}
                  <span>{release.title}</span>
                </td>
                <td className="px-4 py-4">
                  {release.artists?.name || "Unknown Artist"}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    release.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    release.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    release.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {release.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {new Date(release.release_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex space-x-2">
                    {release.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => handleReleaseAction(release.id, 'Approved')}
                          className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleReleaseAction(release.id, 'Rejected')}
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {release.status === 'Approved' && (
                      <button 
                        onClick={() => handleReleaseAction(release.id, 'Processing')}
                        className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        title="Mark as Processing"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <Link 
                      to={`/releases/${release.id}`}
                      className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render withdrawals management tab
  const renderWithdrawalsTab = () => {
    if (loading) return <div className="py-8 text-center text-gray-500">Loading withdrawals...</div>;
    
    if (withdrawals.length === 0) {
      return (
        <div className="py-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-xl font-semibold text-gray-900">No withdrawal requests</h3>
          <p className="text-gray-500">There are no withdrawal requests at the moment.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Artist</th>
              <th scope="col" className="px-4 py-3">Amount</th>
              <th scope="col" className="px-4 py-3">Account Info</th>
              <th scope="col" className="px-4 py-3">Bank</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map(withdrawal => (
              <tr key={withdrawal.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-gray-900">
                  {withdrawal.artists?.name || "Unknown Artist"}
                </td>
                <td className="px-4 py-4">
                  ₦{withdrawal.amount.toLocaleString()}
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium">{withdrawal.account_name}</p>
                  <p className="text-xs text-gray-500">{withdrawal.account_number}</p>
                </td>
                <td className="px-4 py-4">
                  {withdrawal.bank_name || "Not specified"}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    withdrawal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    withdrawal.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {withdrawal.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {new Date(withdrawal.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex space-x-2">
                    {withdrawal.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'COMPLETED')}
                          className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'REJECTED')}
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render artists management tab
  const renderArtistsTab = () => {
    if (loading) return <div className="py-8 text-center text-gray-500">Loading artists...</div>;
    
    if (artists.length === 0) {
      return (
        <div className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-xl font-semibold text-gray-900">No artists found</h3>
          <p className="text-gray-500">There are no artists registered in the system yet.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Phone</th>
              <th scope="col" className="px-4 py-3">Balance</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(artist => (
              <tr key={artist.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-gray-900">
                  {artist.name}
                </td>
                <td className="px-4 py-4">
                  {artist.email}
                </td>
                <td className="px-4 py-4">
                  {artist.phone || 'N/A'}
                </td>
                <td className="px-4 py-4">
                  ₦{(artist.available_balance || 0).toLocaleString()}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    artist.status === 'active' ? 'bg-green-100 text-green-800' : 
                    artist.status === 'banned' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {artist.status || 'active'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex space-x-2">
                    {artist.status !== 'active' ? (
                      <button 
                        onClick={() => handleArtistStatusChange(artist.id, 'active')}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        title="Activate"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleArtistStatusChange(artist.id, 'banned')}
                        className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                        title="Ban"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    <Link 
                      to={`/artists/${artist.id}`}
                      className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render analytics editor tab
  const renderAnalyticsTab = () => {
    return <AdminAnalyticsEditor />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-600 mt-2">Manage your distribution platform</p>
            </div>
            
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-panel p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Music className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-slate-900">{releases.length}</h2>
                    <p className="text-slate-600">Total Releases</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-slate-900">{artists.length}</h2>
                    <p className="text-slate-600">Active Artists</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-slate-900">
                      {withdrawals.filter(w => w.status === 'PENDING').length}
                    </h2>
                    <p className="text-slate-600">Pending Withdrawals</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="mb-6 border-b border-slate-200">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      activeTab === 'releases' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('releases')}
                  >
                    <div className="flex items-center">
                      <Music className="w-4 h-4 mr-2" />
                      Releases
                    </div>
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      activeTab === 'withdrawals' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('withdrawals')}
                  >
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Withdrawals
                    </div>
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      activeTab === 'artists' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('artists')}
                  >
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Artists
                    </div>
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    className={`inline-block p-4 border-b-2 rounded-t-lg ${
                      activeTab === 'analytics' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </div>
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Tab Content */}
            <div className="glass-panel p-6">
              {activeTab === 'releases' && renderReleasesTab()}
              {activeTab === 'withdrawals' && renderWithdrawalsTab()}
              {activeTab === 'artists' && renderArtistsTab()}
              {activeTab === 'analytics' && renderAnalyticsTab()}
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
