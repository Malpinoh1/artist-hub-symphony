
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Release, fetchReleaseDetails } from '../services/releaseService';
import AnimatedCard from '../components/AnimatedCard';
import PerformanceStatisticsForm from '../components/PerformanceStatisticsForm';
import StreamingLinksForm from '../components/StreamingLinksForm';
import ReleaseHeader from '../components/release/ReleaseHeader';
import ReleaseIdentifiers from '../components/release/ReleaseIdentifiers';
import StreamingLinksSection from '../components/release/StreamingLinksSection';
import PerformanceStatsSection from '../components/release/PerformanceStatsSection';
import TakeDownSection from '../components/release/TakeDownSection';
import TakeDownRequestStatus from '../components/release/TakeDownRequestStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ReleaseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [takeDownRequest, setTakeDownRequest] = useState<any | null>(null);
  const [showTakeDownForm, setShowTakeDownForm] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showStatsForm, setShowStatsForm] = useState<boolean>(false);
  const [showLinksForm, setShowLinksForm] = useState<boolean>(false);

  useEffect(() => {
    const fetchReleaseData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check if user is admin
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
            
          setIsAdmin(!!roleData);
        }
        
        // Get release details
        const releaseData = await fetchReleaseDetails(id);
        
        if (!releaseData) {
          throw new Error("Failed to load release details");
        }

        setRelease(releaseData);
        
        // Check if the current user is the artist
        const { data: releaseArtistData } = await supabase
          .from('releases')
          .select('artist_id')
          .eq('id', id)
          .single();
          
        if (session?.user?.id === releaseArtistData?.artist_id) {
          setArtistId(releaseArtistData.artist_id);
          
          // Check if there's an existing take down request
          const { data: takeDownData, error: takeDownError } = await supabase
            .from('take_down_requests')
            .select('*')
            .eq('release_id', id)
            .eq('artist_id', releaseArtistData.artist_id)
            .order('created_at', { ascending: false })
            .maybeSingle();
            
          if (!takeDownError && takeDownData) {
            setTakeDownRequest(takeDownData);
          }
        }
      } catch (error) {
        console.error('Error fetching release details:', error);
        toast.error('Failed to load release details');
      } finally {
        setLoading(false);
      }
    };

    fetchReleaseData();
  }, [id]);

  // Helper function to get status color
  const getStatusColor = () => {
    if (!release) return '';
    
    switch (release.status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
      case 'takedown':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'takedownrequested':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  // Helper function to get status label
  const getStatusLabel = () => {
    if (!release) return '';
    
    switch (release.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'processing':
        return 'Processing';
      case 'takedown':
        return 'Removed';
      case 'takedownrequested':
        return 'Removal Requested';
      default:
        return 'Pending';
    }
  };
  
  const handleTakeDownRequestSubmitted = () => {
    window.location.reload();
  };
  
  const handleStatisticsSubmitted = () => {
    setShowStatsForm(false);
    window.location.reload();
  };
  
  const handleLinksSubmitted = () => {
    setShowLinksForm(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="mb-6">
              <Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          </AnimatedCard>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : release ? (
            <>
              <AnimatedCard>
                <div className="glass-panel p-6 md:p-8 mb-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column (Cover Art & Identifiers) */}
                    <div className="w-full md:w-1/3">
                      <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={release.coverArt} 
                          alt={release.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Release Identifiers */}
                      <ReleaseIdentifiers 
                        release={release}
                        getStatusColor={getStatusColor}
                        getStatusLabel={getStatusLabel}
                      />
                    </div>
                    
                     {/* Right Column (Release Info & Actions) */}
                    <div className="w-full md:w-2/3">
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{release.title}</h1>
                          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">by {release.artist}</p>
                          
                          {/* Release Type & Genre */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary" className="capitalize">
                              {release.release_type || 'Single'}
                            </Badge>
                            {release.genre && (
                              <Badge variant="outline">{release.genre}</Badge>
                            )}
                          </div>

                          {/* Release Information Grid */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                            <h3 className="text-lg font-semibold mb-4 dark:text-slate-200">Release Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Release Date:</span>
                                <p className="text-slate-900 dark:text-slate-200">
                                  {new Date(release.releaseDate).toLocaleDateString()}
                                </p>
                              </div>
                              
                              {release.producer_credits && (
                                <div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Producer(s):</span>
                                  <p className="text-slate-900 dark:text-slate-200">{release.producer_credits}</p>
                                </div>
                              )}
                              
                              {release.songwriter_credits && (
                                <div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Songwriter(s):</span>
                                  <p className="text-slate-900 dark:text-slate-200">{release.songwriter_credits}</p>
                                </div>
                              )}
                              
                              {release.artwork_credits && (
                                <div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Artwork Credits:</span>
                                  <p className="text-slate-900 dark:text-slate-200">{release.artwork_credits}</p>
                                </div>
                              )}
                              
                              {release.copyright_info && (
                                <div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Copyright:</span>
                                  <p className="text-slate-900 dark:text-slate-200">{release.copyright_info}</p>
                                </div>
                              )}
                              
                              <div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Language:</span>
                                <p className="text-slate-900 dark:text-slate-200">{release.primary_language || 'English'}</p>
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tracks:</span>
                                <p className="text-slate-900 dark:text-slate-200">{release.total_tracks || 1}</p>
                              </div>
                              
                              {release.explicit_content && (
                                <div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Content:</span>
                                  <Badge variant="destructive" className="ml-2">Explicit</Badge>
                                </div>
                              )}
                            </div>
                            
                            {release.description && (
                              <div className="mt-4">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Description:</span>
                                <p className="text-slate-900 dark:text-slate-200 mt-1">{release.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Edit Request Button for Artists */}
                        {!!artistId && (release.status === 'approved' || release.status === 'processing') && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Need to make changes?</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                              You can request edits to your release information. Our team will review your request.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/releases/${release.id}/edit-request`)}
                            >
                              Request Edit
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {release.status === 'approved' ? (
                        <div className="space-y-6">
                          <StreamingLinksSection 
                            streamingLinks={release.streamingLinks || []}
                            isAdmin={isAdmin}
                            onShowLinksForm={() => setShowLinksForm(true)}
                          />
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h3 className="font-medium mb-2 dark:text-slate-200">Release Status</h3>
                          {release.status === 'pending' && (
                            <p className="text-slate-600 dark:text-slate-400">
                              Your release is currently under review. We'll notify you once it's processed.
                            </p>
                          )}
                          {release.status === 'rejected' && (
                            <p className="text-slate-600 dark:text-slate-400">
                              Your release was rejected. Please contact support for more information.
                            </p>
                          )}
                          {release.status === 'processing' && (
                            <p className="text-slate-600 dark:text-slate-400">
                              Your release is being processed and will be distributed to platforms soon.
                            </p>
                          )}
                          {release.status === 'takedownrequested' && (
                            <p className="text-slate-600 dark:text-slate-400">
                              A take down request has been submitted for this release.
                            </p>
                          )}
                          {release.status === 'takedown' && (
                            <p className="text-slate-600 dark:text-slate-400">
                              This release has been removed from all platforms.
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Take Down Request Section */}
                      <TakeDownSection 
                        artistId={artistId}
                        releaseId={release.id}
                        releaseStatus={release.status}
                        takeDownRequest={takeDownRequest}
                        showTakeDownForm={showTakeDownForm}
                        onShowTakeDownForm={() => setShowTakeDownForm(true)}
                        onRequestSubmitted={handleTakeDownRequestSubmitted}
                      />
                      
                      {/* Show take down request status */}
                      <TakeDownRequestStatus takeDownRequest={takeDownRequest} />
                    </div>
                  </div>
                </div>
              </AnimatedCard>
              
              {release.status === 'approved' && (
                <AnimatedCard delay={100}>
                  <PerformanceStatsSection 
                    statistics={release.statistics}
                    isAdmin={isAdmin}
                    onShowStatsForm={() => setShowStatsForm(true)}
                  />
                  
                  {/* Stats Form modal */}
                  {showStatsForm && (
                    <PerformanceStatisticsForm 
                      releaseId={release.id} 
                      existingStats={release.statistics}
                      onClose={() => setShowStatsForm(false)}
                      onSubmitted={handleStatisticsSubmitted}
                    />
                  )}
                  
                  {/* Streaming links form modal */}
                  {showLinksForm && (
                    <StreamingLinksForm 
                      releaseId={release.id}
                      existingLinks={release.streamingLinks}
                      onClose={() => setShowLinksForm(false)}
                      onSubmitted={handleLinksSubmitted}
                    />
                  )}
                </AnimatedCard>
              )}
            </>
          ) : (
            <div className="glass-panel p-6 md:p-8 text-center">
              <h2 className="text-xl font-semibold mb-4 dark:text-slate-200">Release Not Found</h2>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                The release you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReleaseDetails;
