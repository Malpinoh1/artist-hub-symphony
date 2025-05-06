
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Music, Share2, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Release } from '../services/releaseService';
import AnimatedCard from '../components/AnimatedCard';
import TakeDownRequestForm from '../components/TakeDownRequestForm';

const ReleaseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [takeDownRequest, setTakeDownRequest] = useState<any | null>(null);
  const [showTakeDownForm, setShowTakeDownForm] = useState<boolean>(false);

  useEffect(() => {
    const fetchReleaseDetails = async () => {
      try {
        setLoading(true);
        
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        
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

        const formattedRelease: Release = {
          id: releaseData.id,
          title: releaseData.title,
          artist: artistData.name,
          coverArt: releaseData.cover_art_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80',
          status: mapReleaseStatus(releaseData.status),
          releaseDate: releaseData.release_date,
          streamingLinks: []  // We'll implement this later if needed
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
  const mapReleaseStatus = (status: string): 'pending' | 'approved' | 'rejected' | 'processing' => {
    switch(status) {
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Processing':
        return 'processing';
      case 'TakeDownRequested':
        return 'pending';
      case 'TakeDown':
        return 'rejected';
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
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
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
      default:
        return 'Pending';
    }
  };
  
  const handleTakeDownRequestSubmitted = () => {
    // Refresh the release data
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
                    <div className="w-full md:w-1/3">
                      <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={release.coverArt} 
                          alt={release.title} 
                          className="w-full h-full object-cover"
                        />
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
                            <h3 className="text-lg font-medium mb-3 dark:text-slate-200">Streaming Links</h3>
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
                                Streaming links will be available once your release is distributed.
                              </p>
                            )}
                          </div>
                          
                          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex gap-3">
                              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                                <Share2 className="w-4 h-4" />
                                Share
                              </button>
                              
                              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                                <Download className="w-4 h-4" />
                                Download Assets
                              </button>
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
                    <h2 className="text-xl font-semibold mb-4 flex items-center dark:text-slate-200">
                      <Music className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Performance Statistics
                    </h2>
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-600 dark:text-slate-400">
                        Performance statistics will be available after your release has accumulated streaming activity.
                      </p>
                    </div>
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
