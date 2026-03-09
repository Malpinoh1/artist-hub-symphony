import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '../integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WizardStepIndicator } from '@/components/release-wizard/WizardStepIndicator';
import { StepAlbumInfo } from '@/components/release-wizard/StepAlbumInfo';
import { StepTrackUpload } from '@/components/release-wizard/StepTrackUpload';
import { StepAlbumArtwork } from '@/components/release-wizard/StepAlbumArtwork';
import { StepDistributionPreferences } from '@/components/release-wizard/StepDistributionPreferences';
import { StepPreviewDistribute } from '@/components/release-wizard/StepPreviewDistribute';

interface ArtistAccount {
  id: string;
  artist_name: string;
  artist_email: string | null;
}

const STEP_LABELS = ['Album Info', 'Tracks', 'Artwork', 'Distribution', 'Preview'];

const ReleaseForm = () => {
  const navigate = useNavigate();

  const [artistAccounts, setArtistAccounts] = useState<ArtistAccount[]>([]);
  const [selectedArtistAccount, setSelectedArtistAccount] = useState<string>('self');
  const [loadingArtists, setLoadingArtists] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    release_type: 'single',
    genre: '',
    description: '',
    release_date: '',
    artwork_credits: '',
    producer_credits: '',
    songwriter_credits: '',
    primary_language: 'English',
    explicit_content: false,
    copyright_info: '',
    submission_notes: '',
    upc: '',
    total_tracks: 1,
    territory: 'World',
    release_time: '',
    release_timezone: '',
    pre_order_enabled: false,
    pre_order_previews: false,
    pricing: 'standard',
    artist_name: '',
  });

  const [tracks, setTracks] = useState<Array<{
    track_number: number; title: string; explicit_content: boolean; featured_artists: string[];
    duration?: number; isrc?: string;
  }>>([{
    track_number: 1, title: '', explicit_content: false, featured_artists: []
  }]);

  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any>({ step: 'idle' });

  // Distribution preferences state
  const [storeSelections, setStoreSelections] = useState<Record<string, { name: string; enabled: boolean; status: 'pending' | 'incomplete' | 'delivered' }>>({});
  const [freeTrackIds, setFreeTrackIds] = useState<string[]>([]);
  const [audioClips, setAudioClips] = useState<Record<string, { clip_start: number; clip_end: number }>>({});

  useEffect(() => {
    const fetchArtistAccounts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
          .from('artist_accounts')
          .select('id, artist_name, artist_email')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: false });
        setArtistAccounts(data || []);
      } catch (e) {
        console.error('Error fetching artist accounts:', e);
      } finally {
        setLoadingArtists(false);
      }
    };
    fetchArtistAccounts();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication required", description: "Please log in to submit releases", variant: "destructive" });
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCoverArtChange = (file: File | null, preview: string | null) => {
    setCoverArt(file);
    setCoverArtPreview(preview);
  };

  const nextStep = () => { setCurrentStep(prev => prev + 1); window.scrollTo(0, 0); };
  const prevStep = () => { setCurrentStep(prev => prev - 1); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const userId = session.user.id;
      const userEmail = session.user.email!;

      // Get profile
      const { data: profileData } = await supabase.from('profiles').select('full_name').eq('user_id', userId).maybeSingle();

      let artistNameOverride: string | undefined;
      if (selectedArtistAccount !== 'self') {
        const selected = artistAccounts.find(a => a.id === selectedArtistAccount);
        if (selected) artistNameOverride = selected.artist_name;
      }

      const artistName = artistNameOverride || profileData?.full_name || userEmail.split('@')[0];

      // Ensure artist record
      let { data: artistData } = await supabase.from('artists').select('name').eq('id', userId).maybeSingle();
      if (!artistData) {
        const { data: newArtist, error: createErr } = await supabase.from('artists').insert({ id: userId, name: artistName, email: userEmail }).select('name').single();
        if (createErr) throw new Error('Failed to create artist profile.');
        artistData = newArtist;
      }

      const releaseArtistName = artistNameOverride || artistData!.name;

      // Upload cover art
      setUploadProgress({ step: 'cover', currentFile: coverArt?.name });
      let coverArtUrl = null;
      if (coverArt) {
        const path = `${userId}/${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
        const { error: coverErr } = await supabase.storage.from('release_artwork').upload(path, coverArt, { cacheControl: '3600', upsert: false });
        if (coverErr) throw new Error(`Cover art upload failed: ${coverErr.message}`);
        const { data: urlData } = supabase.storage.from('release_artwork').getPublicUrl(path);
        coverArtUrl = urlData?.publicUrl;
      }

      // Upload audio files
      const audioFilesUrls: string[] = [];
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        setUploadProgress({ step: 'audio', currentFile: file.name, currentIndex: i + 1, totalFiles: audioFiles.length });
        const path = `${userId}/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: audioErr } = await supabase.storage.from('audio_files').upload(path, file, { cacheControl: '3600', upsert: false });
        if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);
        const { data: urlData } = supabase.storage.from('audio_files').getPublicUrl(path);
        audioFilesUrls.push(urlData?.publicUrl || '');
      }

      // Insert release
      setUploadProgress({ step: 'saving' });
      const enabledPlatforms = Object.values(storeSelections).filter(s => s.enabled).map(s => s.name);

      const { data: insertedRelease, error: releaseErr } = await supabase.from('releases').insert({
        title: formData.title,
        artist_id: userId,
        artist_name: releaseArtistName,
        release_date: formData.release_date,
        release_type: formData.release_type,
        genre: formData.genre,
        description: formData.description,
        primary_language: formData.primary_language,
        explicit_content: formData.explicit_content,
        producer_credits: formData.producer_credits,
        songwriter_credits: formData.songwriter_credits,
        artwork_credits: formData.artwork_credits,
        copyright_info: formData.copyright_info,
        submission_notes: formData.submission_notes,
        total_tracks: tracks.length,
        status: 'Pending',
        cover_art_url: coverArtUrl,
        platforms: enabledPlatforms,
        audio_file_url: audioFilesUrls[0] || null,
        upc: formData.upc || null,
        territory: formData.territory,
        release_time: formData.release_time || null,
        release_timezone: formData.release_timezone || null,
        pre_order_enabled: formData.pre_order_enabled,
        pre_order_previews: formData.pre_order_previews,
        pricing: formData.pricing,
      }).select().single();

      if (releaseErr) throw new Error('Failed to submit release.');

      // Insert tracks
      if (tracks.length > 0) {
        const trackRecords = tracks.map((track, i) => ({
          release_id: insertedRelease.id,
          track_number: track.track_number || (i + 1),
          title: track.title,
          duration: track.duration,
          isrc: track.isrc,
          explicit_content: track.explicit_content || false,
          featured_artists: track.featured_artists || []
        }));
        await supabase.from('release_tracks').insert(trackRecords);
      }

      // Save store selections
      setUploadProgress({ step: 'stores' });
      const storeRecords = Object.values(storeSelections).map(store => ({
        release_id: insertedRelease.id,
        store_name: store.name,
        store_category: getStoreCategory(store.name),
        enabled: store.enabled,
        status: 'pending'
      }));
      if (storeRecords.length > 0) {
        await supabase.from('release_store_selections').insert(storeRecords);
      }

      // Save audio clips
      if (Object.keys(audioClips).length > 0) {
        // Get inserted track IDs
        const { data: insertedTracks } = await supabase.from('release_tracks').select('id, track_number').eq('release_id', insertedRelease.id).order('track_number');
        if (insertedTracks) {
          const clipRecords = Object.entries(audioClips).map(([trackIndex, clip]) => {
            const trackNum = parseInt(trackIndex) + 1;
            const trackRecord = insertedTracks.find(t => t.track_number === trackNum);
            if (!trackRecord) return null;
            return {
              release_id: insertedRelease.id,
              track_id: trackRecord.id,
              clip_start: clip.clip_start,
              clip_end: clip.clip_end,
              clip_type: 'ringtone'
            };
          }).filter(Boolean);
          if (clipRecords.length > 0) {
            await supabase.from('release_audio_clips').insert(clipRecords as any);
          }
        }
      }

      // Save free tracks
      if (freeTrackIds.length > 0) {
        const { data: insertedTracks } = await supabase.from('release_tracks').select('id, track_number').eq('release_id', insertedRelease.id).order('track_number');
        if (insertedTracks) {
          const freeRecords = freeTrackIds.map(idx => {
            const trackNum = parseInt(idx) + 1;
            const trackRecord = insertedTracks.find(t => t.track_number === trackNum);
            if (!trackRecord) return null;
            return { release_id: insertedRelease.id, track_id: trackRecord.id };
          }).filter(Boolean);
          if (freeRecords.length > 0) {
            await supabase.from('release_free_tracks').insert(freeRecords as any);
          }
        }
      }

      // Send email
      try {
        const { sendReleaseSubmissionEmail } = await import('../services/emailService');
        await sendReleaseSubmissionEmail(userEmail, formData.title, releaseArtistName);
      } catch (e) { console.error('Email error:', e); }

      setUploadProgress({ step: 'done' });
      toast({ title: "Success!", description: "Your release has been submitted for review" });
      setCurrentStep(6); // Success step
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : 'Failed to submit release', variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setUploadProgress({ step: 'idle' });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepAlbumInfo formData={formData} onInputChange={handleInputChange} artistAccounts={artistAccounts} selectedArtistAccount={selectedArtistAccount} onArtistAccountChange={setSelectedArtistAccount} onNext={nextStep} />;
      case 2:
        return <StepTrackUpload formData={formData} tracks={tracks} onTracksChange={setTracks} audioFiles={audioFiles} onAudioFilesChange={setAudioFiles} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <StepAlbumArtwork formData={formData} onInputChange={handleInputChange} coverArt={coverArt} coverArtPreview={coverArtPreview} onCoverArtChange={handleCoverArtChange} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <StepDistributionPreferences formData={formData} onInputChange={handleInputChange} tracks={tracks} coverArtPreview={coverArtPreview} storeSelections={storeSelections} onStoreSelectionsChange={setStoreSelections} freeTrackIds={freeTrackIds} onFreeTrackIdsChange={setFreeTrackIds} audioClips={audioClips} onAudioClipsChange={setAudioClips} onNext={nextStep} onPrev={prevStep} />;
      case 5:
        return <StepPreviewDistribute formData={{ ...formData, artist_name: selectedArtistAccount !== 'self' ? artistAccounts.find(a => a.id === selectedArtistAccount)?.artist_name : '' }} tracks={tracks} coverArtPreview={coverArtPreview} storeSelections={storeSelections} termsAccepted={termsAccepted} onTermsAcceptedChange={setTermsAccepted} isSubmitting={isSubmitting} uploadProgress={uploadProgress} onPrev={prevStep} onSubmit={handleSubmit} />;
      case 6:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-primary/10">
              <Check className="w-8 h-8 text-primary" />
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Release Submitted Successfully!</h2>
              <p className="text-muted-foreground">Your release has been submitted for review. We'll notify you once it's processed.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild><Link to="/dashboard">Return to Dashboard</Link></Button>
              <Button variant="outline" asChild><Link to="/releases">View Releases</Link></Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="max-w-4xl mx-auto">
              {currentStep <= 5 && (
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">Submit New Release</h1>
                    <p className="text-sm text-muted-foreground">Complete the steps below to submit your music for distribution.</p>
                  </div>
                  <WizardStepIndicator currentStep={currentStep} totalSteps={5} stepLabels={STEP_LABELS} />
                </>
              )}
              <Card>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {renderStep()}
                </CardContent>
              </Card>
            </div>
          </AnimatedCard>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function getStoreCategory(storeName: string): string {
  const essential = ['Spotify', 'Apple Music / iTunes', 'YouTube Music', 'Deezer', 'Tidal', 'Amazon Music', 'SoundCloud', 'Facebook', 'TikTok', 'Boomplay', 'Audiomack', 'Anghami', 'Snapchat'];
  const ringtone = ['iTunes Ringtones', 'Claro Ringtones', 'Algar'];
  const neighbouring = ['SoundExchange'];
  if (essential.includes(storeName)) return 'essential';
  if (ringtone.includes(storeName)) return 'ringtone';
  if (neighbouring.includes(storeName)) return 'neighbouring_rights';
  return 'other';
}

export default ReleaseForm;
