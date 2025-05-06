
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Music, Share2, Download, AlertTriangle, FileText, Link2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Release } from '../services/releaseService';
import AnimatedCard from '../components/AnimatedCard';
import TakeDownRequestForm from '../components/TakeDownRequestForm';
import { Button } from '@/components/ui/button';
import PerformanceStatisticsForm from '../components/PerformanceStatisticsForm';
import StreamingLinksForm from '../components/StreamingLinksForm';
import { themeClass } from '@/lib/utils';

const ReleaseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [takeDownRequest, setTakeDownRequest] = useState<any | null>(null);
  const [showTakeDownForm, setShowTakeDownForm] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showStatsForm, setShowStatsForm] = useState<boolean>(false);
  const [showLinksForm, setShowLinksForm] = useState<boolean>(false);

  useEffect(() => {
    const fetchReleaseDetails = async () => {
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
        
        // Get release information
        const { data: releaseData, error: releaseError } = await supabase
          .from('releases')
          .select('*')
          .eq('id', id)
          .single();

        if (releaseError) {
          throw releaseError;
        }

        // Get artist information
        const { data: artistData, error: artistError } = await supabase
          .from('artists')
          .select('name')
          .eq('id', releaseData.artist_id)
          .single();

        if (artistError) {
          throw artistError;
        }

        // Check if the current user is the artist
        if (session?.user?.id === releaseData.artist_id) {
          setArtistId(releaseData.artist_id);
          
          // Check if there's an existing take down request
          const { data: takeDownData, error: takeDownError } = await supabase
            .from('take_down_requests')
            .select('*')
            .eq('release_id', id)
            .eq('artist_id', releaseData.artist_id)
            .order('created_at', { ascending: false })
            .maybeSingle();
            
          if (!takeDownError && takeDownData) {
            setTakeDownRequest(takeDownData);
          }
        }

        // Get streaming links for this release
        const { data: streamingLinksData, error: streamingLinksError } = await supabase
          .from('streaming_links')
          .select('*')
          .eq('release_id', id);
          
        let streamingLinks = [];
        if (!streamingLinksError && streamingLinksData) {
          streamingLinks = streamingLinksData.map(link => ({
            platform: link.platform,
            url: link.url
          }));
        }
        
        // Get performance statistics for this release
        const { data: statsData, error: statsError } = await supabase
          .from('performance_statistics')
          .select('*')
          .eq('release_id', id)
          .order('date', { ascending: false })
          .maybeSingle();
        
        const statistics = !statsError && statsData ? statsData : null;

        const formattedRelease: Release = {
          id: releaseData.id,
          title: releaseData.title,
          artist: artistData.name,
          coverArt: releaseData.cover_art_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80',
          status: mapReleaseStatus(releaseData.status),
          releaseDate: releaseData.release_date,
          streamingLinks: streamingLinks,
          upc: releaseData.upc || 'Not assigned',
          isrc: releaseData.isrc || 'Not assigned',
          statistics: statistics
        };

        setRelease(formattedRelease);
      } catch (error) {
        console.error('Error fetching release details:', error);
        toast.error('Failed to load release details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReleaseDetails();
    }
  }, [id]);

  // Helper function to map database status to UI status
  const mapReleaseStatus = (status: string): 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested' => {
    switch(status) {
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Processing':
        return 'processing';
      case 'TakeDownRequested':
        return 'takedownrequested';
      case 'TakeDown':
        return 'takedown';
      case 'Pending':
      default:
        return 'pending';
    }
  };

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
    // Refresh the release data
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
  
  const downloadAssets = async () => {
    if (!release) return;
    
    try {
      // Get audio file URL from the release
      const { data: releaseData, error: releaseError } = await supabase
        .from('releases')
        .select('audio_file_url')
        .eq('id', release.id)
        .single();
        
      if (releaseError) {
        throw releaseError;
      }
      
      if (!releaseData.audio_file_url) {
        toast.error('No audio file available for download');
        return;
      }
      
      // Create a temporary anchor to download the file
      const link = document.createElement('a');
      link.href = releaseData.audio_file_url;
      link.download = `${release.title} - ${release.artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading assets:', error);
      toast.error('Failed to download assets');
    }
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
                    <div className="w-full md:w-1/3">
                      <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={release.coverArt} 
                          alt={release.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Release Identifiers */}
                      <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-medium mb-3 flex items-center dark:text-slate-200">
                          <FileText className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                          Release Information
                        </h3>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">UPC:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{release.upc}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">ISRC:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{release.isrc}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Status:</span>
                            <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getStatusColor()}`}>
                              {getStatusLabel()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-2/3">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor()}`}>
                          {getStatusLabel()}
                        </span>
                        
                        {release.releaseDate && (
                          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            Release Date: {new Date(release.releaseDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-slate-900 dark:text-slate-50">{release.title}</h1>
                      <h2 className="text-xl text-slate-700 dark:text-slate-300 mb-6">{release.artist}</h2>
                      
                      {release.status === 'approved' ? (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-3 flex items-center dark:text-slate-200">
                              <Link2 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                              Streaming Links
                            </h3>
                            {release.streamingLinks && release.streamingLinks.length > 0 ? (
                              <div className="flex flex-wrap gap-3">
                                {release.streamingLinks.map((link, index) => (
                                  <a 
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="font-medium">{link.platform}</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-500 dark:text-slate-400">
                                No streaming links available yet.
                              </p>
                            )}
                            
                            {isAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-3"
                                onClick={() => setShowLinksForm(true)}
                              >
                                Manage Streaming Links
                              </Button>
                            )}
                          </div>
                          
                          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex gap-3 flex-wrap">
                              <Button 
                                variant="default" 
                                className="inline-flex items-center gap-2"
                              >
                                <Share2 className="w-4 h-4" />
                                Share
                              </Button>
                              
                              <Button
                                variant="outline"
                                className={themeClass(
                                  "bg-white border border-slate-200 hover:bg-slate-50",
                                  "bg-slate-800 border-slate-700 hover:bg-slate-700"
                                )}
                                onClick={downloadAssets}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Assets
                              </Button>
                            </div>
                          </div>
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
                      {artistId && release.status === 'approved' && !takeDownRequest && (
                        <div className="mt-6">
                          {showTakeDownForm ? (
                            <TakeDownRequestForm 
                              releaseId={release.id}
                              artistId={artistId}
                              onRequestSubmitted={handleTakeDownRequestSubmitted}
                            />
                          ) : (
                            <button
                              onClick={() => setShowTakeDownForm(true)}
                              className="mt-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Request Take Down
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Show take down request status */}
                      {takeDownRequest && (
                        <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="text-amber-600 dark:text-amber-500 w-5 h-5 mt-0.5" />
                            <div>
                              <h3 className="font-medium text-amber-800 dark:text-amber-400">Take Down Request Submitted</h3>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                Status: <span className="font-medium">{takeDownRequest.status}</span>
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Submitted on {new Date(takeDownRequest.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
              
              {release.status === 'approved' && (
                <AnimatedCard delay={100}>
                  <div className="glass-panel p-6 md:p-8 mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold flex items-center dark:text-slate-200">
                        <Music className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Performance Statistics
                      </h2>
                      
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowStatsForm(true)}
                        >
                          Update Statistics
                        </Button>
                      )}
                    </div>
                    
                    {release.statistics ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Streams</h4>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{release.statistics.total_streams?.toLocaleString() || '0'}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Spotify</h4>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{release.statistics.spotify_streams?.toLocaleString() || '0'}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Apple Music</h4>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{release.statistics.apple_music_streams?.toLocaleString() || '0'}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Last Updated</h4>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {new Date(release.statistics.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-600 dark:text-slate-400">
                          Performance statistics will be available after your release has accumulated streaming activity.
                        </p>
                      </div>
                    )}
                    
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
                  </div>
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
