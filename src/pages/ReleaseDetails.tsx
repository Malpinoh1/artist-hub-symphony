import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Globe, Clock, Music, Disc, DollarSign, Store, ExternalLink, Shield, Scissors, Download } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { Release, fetchReleaseDetails } from '../services/releaseService';
import AnimatedCard from '../components/AnimatedCard';
import PerformanceStatisticsForm from '../components/PerformanceStatisticsForm';
import StreamingLinksForm from '../components/StreamingLinksForm';
import StreamingLinksSection from '../components/release/StreamingLinksSection';
import PerformanceStatsSection from '../components/release/PerformanceStatsSection';
import TakeDownSection from '../components/release/TakeDownSection';
import TakeDownRequestStatus from '../components/release/TakeDownRequestStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { getStoreIcon, StoreStatusBadge } from '@/components/release/StoreIcons';

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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          setIsAdmin(!!roleData);
        }
        
        const releaseData = await fetchReleaseDetails(id);
        if (!releaseData) throw new Error("Failed to load release details");
        setRelease(releaseData);
        
        const { data: releaseArtistData } = await supabase
          .from('releases')
          .select('artist_id')
          .eq('id', id)
          .single();
          
        if (session?.user?.id === releaseArtistData?.artist_id) {
          setArtistId(releaseArtistData.artist_id);
          const { data: takeDownData, error: takeDownError } = await supabase
            .from('take_down_requests')
            .select('*')
            .eq('release_id', id)
            .eq('artist_id', releaseArtistData.artist_id)
            .order('created_at', { ascending: false })
            .maybeSingle();
          if (!takeDownError && takeDownData) setTakeDownRequest(takeDownData);
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

  const getStatusVariant = () => {
    if (!release) return 'secondary' as const;
    switch (release.status) {
      case 'approved': return 'default' as const;
      case 'rejected':
      case 'takedown': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  const getStatusLabel = () => {
    if (!release) return '';
    switch (release.status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'processing': return 'Processing';
      case 'takedown': return 'Removed';
      case 'takedownrequested': return 'Removal Requested';
      default: return 'Pending';
    }
  };

  const getStatusColor = () => {
    if (!release) return '';
    switch (release.status) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
      case 'takedown': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'processing': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'takedownrequested': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };
  
  const handleTakeDownRequestSubmitted = () => window.location.reload();
  const handleStatisticsSubmitted = () => { setShowStatsForm(false); window.location.reload(); };
  const handleLinksSubmitted = () => { setShowLinksForm(false); window.location.reload(); };

  // Group stores by category
  const groupedStores = release?.storeSelections?.reduce((acc, store) => {
    const cat = store.store_category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(store);
    return acc;
  }, {} as Record<string, typeof release.storeSelections>) || {};

  const categoryLabels: Record<string, string> = {
    essential: 'Essential Stores',
    other: 'Other Stores',
    neighbouring_rights: 'Neighbouring Rights',
    ringtone: 'Ringtone Stores',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back button */}
          <div className="mb-6">
            <Link to="/releases" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Releases
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : release ? (
            <div className="space-y-6">
              {/* Hero Card */}
              <AnimatedCard>
                <Card className="overflow-hidden">
                  <div className="bg-muted/30 p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="w-full sm:w-48 lg:w-56 shrink-0">
                        <div className="aspect-square rounded-xl overflow-hidden shadow-lg border">
                          <img src={release.coverArt} alt={release.title} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={getStatusColor()}>{getStatusLabel()}</Badge>
                            <Badge variant="outline" className="capitalize">{release.release_type || 'Single'}</Badge>
                            {release.genre && <Badge variant="outline">{release.genre}</Badge>}
                            {release.explicit_content && <Badge variant="destructive">Explicit</Badge>}
                          </div>
                          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{release.title}</h1>
                          <p className="text-lg text-muted-foreground">by {release.artist}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>{release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : 'Not set'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span>{release.territory || 'World'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Disc className="w-4 h-4 shrink-0" />
                            <span>{release.total_tracks || 1} track{(release.total_tracks || 1) !== 1 ? 's' : ''}</span>
                          </div>
                          {release.release_time && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>{release.release_time} {release.release_timezone || ''}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="w-4 h-4 shrink-0" />
                            <span className="capitalize">{release.pricing || 'Standard'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="w-4 h-4 shrink-0" />
                            <span>{release.primary_language || 'English'}</span>
                          </div>
                        </div>

                        {/* Identifiers */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">UPC: </span>
                            <span className="font-mono text-foreground">{release.upc}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ISRC: </span>
                            <span className="font-mono text-foreground">{release.isrc}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!!artistId && (release.status === 'approved' || release.status === 'processing') && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/releases/${release.id}/edit-request`)}>
                            Request Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </AnimatedCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Album Information */}
                  <AnimatedCard delay={50}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Music className="w-4 h-4" /> Album Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          {release.producer_credits && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium">Producer(s)</span>
                              <p className="text-foreground">{release.producer_credits}</p>
                            </div>
                          )}
                          {release.songwriter_credits && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium">Songwriter(s)</span>
                              <p className="text-foreground">{release.songwriter_credits}</p>
                            </div>
                          )}
                          {release.artwork_credits && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium">Artwork Credits</span>
                              <p className="text-foreground">{release.artwork_credits}</p>
                            </div>
                          )}
                          {release.copyright_info && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium">Copyright</span>
                              <p className="text-foreground">{release.copyright_info}</p>
                            </div>
                          )}
                          {release.pre_order_enabled && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium">Pre-order</span>
                              <p className="text-foreground">Enabled {release.pre_order_previews ? '(with previews)' : '(no previews)'}</p>
                            </div>
                          )}
                        </div>
                        {release.description && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium">Description</span>
                            <p className="text-sm text-foreground mt-1">{release.description}</p>
                          </div>
                        )}
                        {release.submission_notes && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium">Notes</span>
                            <p className="text-sm text-foreground mt-1">{release.submission_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </AnimatedCard>

                  {/* Tracklist */}
                  {release.tracks && release.tracks.length > 0 && (
                    <AnimatedCard delay={100}>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Disc className="w-4 h-4" /> Tracklist ({release.tracks.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="divide-y divide-border">
                            {release.tracks.map((track) => {
                              const isFree = release.freeTracks?.some(f => f.track_id === track.id);
                              const hasClip = release.audioClips?.some(c => c.track_id === track.id);
                              return (
                                <div key={track.track_number} className="flex items-center gap-3 py-3 group">
                                  <span className="text-xs text-muted-foreground w-6 text-right font-mono">{track.track_number}</span>
                                  <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{track.title}</p>
                                    {track.featured_artists && track.featured_artists.length > 0 && (
                                      <p className="text-xs text-muted-foreground">feat. {track.featured_artists.join(', ')}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isFree && (
                                      <Badge variant="outline" className="text-[10px]">
                                        <Download className="w-2.5 h-2.5 mr-1" /> Free
                                      </Badge>
                                    )}
                                    {hasClip && (
                                      <Badge variant="outline" className="text-[10px]">
                                        <Scissors className="w-2.5 h-2.5 mr-1" /> Clip
                                      </Badge>
                                    )}
                                    {track.explicit_content && <Badge variant="destructive" className="text-[10px]">E</Badge>}
                                    {track.isrc && <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{track.isrc}</span>}
                                    {track.duration && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedCard>
                  )}

                  {/* Store Distribution */}
                  {release.storeSelections && release.storeSelections.length > 0 && (
                    <AnimatedCard delay={150}>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Store className="w-4 h-4" /> Store Distribution ({release.storeSelections.filter(s => s.enabled).length} active)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {Object.entries(groupedStores).map(([category, stores]) => (
                            <div key={category}>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {categoryLabels[category] || category}
                              </h4>
                              <div className="space-y-1">
                                {stores!.map(store => (
                                  <div key={store.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {getStoreIcon(store.store_name)}
                                      <span className="text-sm font-medium truncate">{store.store_name}</span>
                                      <StoreStatusBadge status={store.status} />
                                    </div>
                                    <Switch checked={store.enabled} disabled />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </AnimatedCard>
                  )}

                  {/* Streaming Links */}
                  {release.status === 'approved' && (
                    <AnimatedCard delay={200}>
                      <StreamingLinksSection 
                        streamingLinks={release.streamingLinks || []}
                        isAdmin={isAdmin}
                        onShowLinksForm={() => setShowLinksForm(true)}
                      />
                    </AnimatedCard>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  {/* Release Status */}
                  <AnimatedCard delay={100}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Release Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge className={`${getStatusColor()} text-sm px-3 py-1`}>{getStatusLabel()}</Badge>
                        <p className="text-sm text-muted-foreground mt-3">
                          {release.status === 'pending' && 'Your release is currently under review. We\'ll notify you once it\'s processed.'}
                          {release.status === 'approved' && 'Your release is live and distributed to all selected platforms.'}
                          {release.status === 'rejected' && 'Your release was rejected. Please contact support for more information.'}
                          {release.status === 'processing' && 'Your release is being processed and will be distributed to platforms soon.'}
                          {release.status === 'takedownrequested' && 'A take down request has been submitted for this release.'}
                          {release.status === 'takedown' && 'This release has been removed from all platforms.'}
                        </p>
                      </CardContent>
                    </Card>
                  </AnimatedCard>

                  {/* Release Settings */}
                  <AnimatedCard delay={150}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Release Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Territory</span>
                          <span className="font-medium">{release.territory || 'World'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pricing</span>
                          <span className="font-medium capitalize">{release.pricing || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pre-order</span>
                          <span className="font-medium">{release.pre_order_enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Language</span>
                          <span className="font-medium">{release.primary_language || 'English'}</span>
                        </div>
                        {release.platforms && release.platforms.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-xs">Platforms</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {release.platforms.slice(0, 5).map(p => (
                                <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                              ))}
                              {release.platforms.length > 5 && (
                                <Badge variant="secondary" className="text-[10px]">+{release.platforms.length - 5}</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </AnimatedCard>

                  {/* Take Down Section */}
                  <TakeDownSection 
                    artistId={artistId}
                    releaseId={release.id}
                    releaseStatus={release.status}
                    takeDownRequest={takeDownRequest}
                    showTakeDownForm={showTakeDownForm}
                    onShowTakeDownForm={() => setShowTakeDownForm(true)}
                    onRequestSubmitted={handleTakeDownRequestSubmitted}
                  />
                  
                  <TakeDownRequestStatus takeDownRequest={takeDownRequest} />
                </div>
              </div>

              {/* Performance Stats */}
              {release.status === 'approved' && (
                <AnimatedCard delay={250}>
                  <PerformanceStatsSection 
                    statistics={release.statistics}
                    isAdmin={isAdmin}
                    onShowStatsForm={() => setShowStatsForm(true)}
                  />
                  
                  {showStatsForm && (
                    <PerformanceStatisticsForm 
                      releaseId={release.id} 
                      existingStats={release.statistics}
                      onClose={() => setShowStatsForm(false)}
                      onSubmitted={handleStatisticsSubmitted}
                    />
                  )}
                  
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
            </div>
          ) : (
            <Card className="p-6 sm:p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Release Not Found</h2>
              <p className="mb-6 text-muted-foreground">
                The release you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild>
                <Link to="/releases">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Releases
                </Link>
              </Button>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReleaseDetails;
