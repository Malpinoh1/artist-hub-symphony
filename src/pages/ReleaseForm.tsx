import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Save, AlertCircle } from 'lucide-react';
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
import ReleaseSubmissionGateModal from '@/components/ReleaseSubmissionGateModal';
import { useReleaseDraft } from '@/hooks/useReleaseDraft';
import { useAuth } from '@/contexts/AuthContext';

interface ArtistAccount {
  id: string;
  artist_name: string;
  artist_email: string | null;
}

const STEP_LABELS = ['Album Info', 'Track Upload', 'Artwork', 'Distribution', 'Preview & Submit'];

const DEFAULT_FORM = {
  title: '', release_type: 'single', genre: '', description: '', release_date: '',
  artwork_credits: '', producer_credits: '', songwriter_credits: '',
  primary_language: 'English', explicit_content: false, copyright_info: '',
  submission_notes: '', upc: '', total_tracks: 1, territory: 'World',
  release_time: '', release_timezone: '',
  pre_order_enabled: false, pre_order_previews: false, pricing: 'standard', artist_name: '',
};

const ReleaseForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [artistAccounts, setArtistAccounts] = useState<ArtistAccount[]>([]);
  const [selectedArtistAccount, setSelectedArtistAccount] = useState<string>('self');
  const [loadingArtists, setLoadingArtists] = useState(true);

  const [formData, setFormData] = useState<any>(DEFAULT_FORM);
  const [tracks, setTracks] = useState<any[]>([{ track_number: 1, title: '', explicit_content: false, featured_artists: [] }]);

  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [coverArtUrlRef] = useState<{ current: string | null }>({ current: null });
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [audioFileUrlsRef] = useState<{ current: string[] }>({ current: [] });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any>({ step: 'idle' });
  const [gateOpen, setGateOpen] = useState(false);

  const [storeSelections, setStoreSelections] = useState<Record<string, any>>({});
  const [freeTrackIds, setFreeTrackIds] = useState<string[]>([]);
  const [audioClips, setAudioClips] = useState<Record<string, any>>({});

  const [resumed, setResumed] = useState(false);
  const isResumeIntent = searchParams.get('resume') === '1';

  const { draft, loaded: draftLoaded, scheduleSave, saveNow, clearDraft } = useReleaseDraft({
    userId: user?.id ?? null,
    enabled: !!user,
  });

  // Restore draft once
  useEffect(() => {
    if (!draftLoaded || resumed || !draft) return;
    const d = draft.data || ({} as any);
    if (d.formData) setFormData({ ...DEFAULT_FORM, ...d.formData });
    if (Array.isArray(d.tracks) && d.tracks.length > 0) setTracks(d.tracks);
    if (d.storeSelections) setStoreSelections(d.storeSelections);
    if (Array.isArray(d.freeTrackIds)) setFreeTrackIds(d.freeTrackIds);
    if (d.audioClips) setAudioClips(d.audioClips);
    if (typeof d.termsAccepted === 'boolean') setTermsAccepted(d.termsAccepted);
    if (draft.cover_art_url) {
      coverArtUrlRef.current = draft.cover_art_url;
      setCoverArtPreview(draft.cover_art_url);
    }
    if (draft.audio_file_urls?.length) {
      audioFileUrlsRef.current = draft.audio_file_urls;
    }
    if (draft.current_step) setCurrentStep(Math.min(draft.current_step, 5));
    if (draft.selected_artist_account) setSelectedArtistAccount(draft.selected_artist_account);
    setResumed(true);
    if (isResumeIntent) {
      toast({ title: 'Draft restored', description: 'Your release is right where you left it.' });
    }
  }, [draftLoaded, draft, resumed, isResumeIntent, coverArtUrlRef, audioFileUrlsRef]);

  // Auto-save (debounced)
  useEffect(() => {
    if (!draftLoaded || !user) return;
    if (currentStep >= 6) return; // Don't save the success screen as a draft
    scheduleSave({
      data: { formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted },
      cover_art_url: coverArtUrlRef.current,
      audio_file_urls: audioFileUrlsRef.current,
      current_step: currentStep,
      selected_artist_account: selectedArtistAccount,
    });
  }, [formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted, currentStep, selectedArtistAccount, draftLoaded, user, scheduleSave, coverArtUrlRef, audioFileUrlsRef]);

  // Upload cover-art the moment it's chosen so it survives payment redirect.
  const coverUploadingRef = useRef(false);
  useEffect(() => {
    if (!coverArt || !user || coverUploadingRef.current) return;
    coverUploadingRef.current = true;
    (async () => {
      try {
        const path = `${user.id}/${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('release_artwork').upload(path, coverArt, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('release_artwork').getPublicUrl(path);
        coverArtUrlRef.current = urlData?.publicUrl ?? null;
        // Trigger save
        scheduleSave({
          data: { formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted },
          cover_art_url: coverArtUrlRef.current,
          audio_file_urls: audioFileUrlsRef.current,
          current_step: currentStep,
          selected_artist_account: selectedArtistAccount,
        });
      } catch (e: any) {
        console.error('Background cover upload failed:', e);
      } finally {
        coverUploadingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverArt, user?.id]);

  // Upload audio files the moment they're chosen.
  const audioUploadingRef = useRef(false);
  useEffect(() => {
    if (!audioFiles.length || !user || audioUploadingRef.current) return;
    if (audioFiles.length === audioFileUrlsRef.current.length) return;
    audioUploadingRef.current = true;
    (async () => {
      try {
        const urls: string[] = [];
        for (let i = 0; i < audioFiles.length; i++) {
          const f = audioFiles[i];
          const path = `${user.id}/${Date.now()}_${i}_${f.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error } = await supabase.storage.from('audio_files').upload(path, f, { cacheControl: '3600', upsert: false });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('audio_files').getPublicUrl(path);
          urls.push(urlData?.publicUrl || '');
        }
        audioFileUrlsRef.current = urls;
        scheduleSave({
          data: { formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted },
          cover_art_url: coverArtUrlRef.current,
          audio_file_urls: urls,
          current_step: currentStep,
          selected_artist_account: selectedArtistAccount,
        });
      } catch (e: any) {
        console.error('Background audio upload failed:', e);
      } finally {
        audioUploadingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFiles, user?.id]);

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
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleCoverArtChange = (file: File | null, preview: string | null) => {
    setCoverArt(file);
    setCoverArtPreview(preview);
    if (!file) coverArtUrlRef.current = null;
  };
  const nextStep = () => { setCurrentStep(prev => prev + 1); window.scrollTo(0, 0); };
  const prevStep = () => { setCurrentStep(prev => prev - 1); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/auth'); return; }

    // Pre-flight payment gate check
    try {
      const { data: gate } = await supabase.rpc('check_release_submission_allowed', { uid: session.user.id });
      if (gate && (gate as any).allowed === false) {
        // Persist draft synchronously so payment-redirect doesn't lose anything
        await saveNow({
          data: { formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted },
          cover_art_url: coverArtUrlRef.current,
          audio_file_urls: audioFileUrlsRef.current,
          current_step: currentStep,
          selected_artist_account: selectedArtistAccount,
        });
        setGateOpen(true);
        return;
      }
    } catch (e) {
      console.warn('Gate pre-check failed:', e);
    }

    setIsSubmitting(true);
    try {
      const userId = session.user.id;
      const userEmail = session.user.email!;

      const { data: profileData } = await supabase.from('profiles').select('full_name').eq('user_id', userId).maybeSingle();

      let artistNameOverride: string | undefined;
      if (selectedArtistAccount !== 'self') {
        const selected = artistAccounts.find(a => a.id === selectedArtistAccount);
        if (selected) artistNameOverride = selected.artist_name;
      }
      const artistName = artistNameOverride || profileData?.full_name || userEmail.split('@')[0];

      let { data: artistData } = await supabase.from('artists').select('name').eq('id', userId).maybeSingle();
      if (!artistData) {
        const { data: newArtist, error: createErr } = await supabase.from('artists').insert({ id: userId, name: artistName, email: userEmail }).select('name').single();
        if (createErr) throw new Error('Failed to create artist profile.');
        artistData = newArtist;
      }
      const releaseArtistName = artistNameOverride || artistData!.name;

      // Use already-uploaded URLs; fall back to per-submit upload if missing.
      setUploadProgress({ step: 'cover' });
      let coverArtUrl = coverArtUrlRef.current;
      if (!coverArtUrl && coverArt) {
        const path = `${userId}/${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
        const { error: coverErr } = await supabase.storage.from('release_artwork').upload(path, coverArt, { cacheControl: '3600', upsert: false });
        if (coverErr) throw new Error(`Cover art upload failed: ${coverErr.message}`);
        const { data: urlData } = supabase.storage.from('release_artwork').getPublicUrl(path);
        coverArtUrl = urlData?.publicUrl || null;
        coverArtUrlRef.current = coverArtUrl;
      }

      let audioFilesUrls = [...audioFileUrlsRef.current];
      if (audioFiles.length && audioFilesUrls.length !== audioFiles.length) {
        audioFilesUrls = [];
        for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i];
          setUploadProgress({ step: 'audio', currentFile: file.name, currentIndex: i + 1, totalFiles: audioFiles.length });
          const path = `${userId}/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error: audioErr } = await supabase.storage.from('audio_files').upload(path, file, { cacheControl: '3600', upsert: false });
          if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);
          const { data: urlData } = supabase.storage.from('audio_files').getPublicUrl(path);
          audioFilesUrls.push(urlData?.publicUrl || '');
        }
        audioFileUrlsRef.current = audioFilesUrls;
      }

      setUploadProgress({ step: 'saving' });
      const enabledPlatforms = Object.values(storeSelections).filter((s: any) => s.enabled).map((s: any) => s.name);

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

      if (releaseErr) throw new Error(releaseErr.message || 'Failed to submit release.');

      if (tracks.length > 0) {
        const trackRecords = tracks.map((track: any, i: number) => ({
          release_id: insertedRelease.id,
          track_number: track.track_number || (i + 1),
          title: track.title,
          duration: track.duration,
          isrc: track.isrc,
          explicit_content: track.explicit_content || false,
          featured_artists: track.featured_artists || []
        }));
        const { data: insertedReleaseTracks } = await supabase.from('release_tracks').insert(trackRecords).select('id, title, track_number');
        if (insertedReleaseTracks && insertedReleaseTracks.length > 0) {
          const incomeTrackRecords = insertedReleaseTracks.map(rt => ({
            title: rt.title, primary_artist_id: userId,
            release_id: insertedRelease.id, release_track_id: rt.id,
          }));
          await supabase.from('tracks').insert(incomeTrackRecords);
        }
      }

      setUploadProgress({ step: 'stores' });
      const storeRecords = Object.values(storeSelections).map((store: any) => ({
        release_id: insertedRelease.id,
        store_name: store.name,
        store_category: getStoreCategory(store.name),
        enabled: store.enabled,
        status: 'pending'
      }));
      if (storeRecords.length > 0) {
        await supabase.from('release_store_selections').insert(storeRecords);
      }

      if (Object.keys(audioClips).length > 0) {
        const { data: insertedTracks } = await supabase.from('release_tracks').select('id, track_number').eq('release_id', insertedRelease.id).order('track_number');
        if (insertedTracks) {
          const clipRecords = Object.entries(audioClips).map(([trackIndex, clip]: any) => {
            const trackNum = parseInt(trackIndex) + 1;
            const trackRecord = insertedTracks.find((t: any) => t.track_number === trackNum);
            if (!trackRecord) return null;
            return { release_id: insertedRelease.id, track_id: trackRecord.id, clip_start: clip.clip_start, clip_end: clip.clip_end, clip_type: 'ringtone' };
          }).filter(Boolean);
          if (clipRecords.length > 0) await supabase.from('release_audio_clips').insert(clipRecords as any);
        }
      }

      if (freeTrackIds.length > 0) {
        const { data: insertedTracks } = await supabase.from('release_tracks').select('id, track_number').eq('release_id', insertedRelease.id).order('track_number');
        if (insertedTracks) {
          const freeRecords = freeTrackIds.map(idx => {
            const trackNum = parseInt(idx) + 1;
            const trackRecord = insertedTracks.find((t: any) => t.track_number === trackNum);
            if (!trackRecord) return null;
            return { release_id: insertedRelease.id, track_id: trackRecord.id };
          }).filter(Boolean);
          if (freeRecords.length > 0) await supabase.from('release_free_tracks').insert(freeRecords as any);
        }
      }

      try {
        const { sendReleaseSubmissionEmail } = await import('../services/emailService');
        await sendReleaseSubmissionEmail(userEmail, formData.title, releaseArtistName);
      } catch (e) { console.error('Email error:', e); }

      // Submission successful → clear the draft
      await clearDraft();

      setUploadProgress({ step: 'done' });
      toast({ title: "Success!", description: "Your release has been submitted for review" });
      setCurrentStep(6);
    } catch (error) {
      console.error('Submit error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to submit release';
      if (msg.toLowerCase().includes('release submission requires payment')) {
        await saveNow({
          data: { formData, tracks, storeSelections, freeTrackIds, audioClips, termsAccepted },
          cover_art_url: coverArtUrlRef.current,
          audio_file_urls: audioFileUrlsRef.current,
          current_step: currentStep,
          selected_artist_account: selectedArtistAccount,
        });
        setGateOpen(true);
      } else {
        toast({ title: "Upload Failed", description: msg, variant: "destructive" });
      }
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
    <div className="container mx-auto px-4">
      <AnimatedCard>
        <div className="max-w-4xl mx-auto">
          {currentStep <= 5 && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Submit New Release</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <p>Complete the steps below to submit your music for distribution.</p>
                </div>
                {draft && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <Save className="h-3 w-3" />
                    Draft auto-saved — you can leave and come back any time.
                  </div>
                )}
                {(coverArtUrlRef.current && !coverArt) || (audioFileUrlsRef.current.length > 0 && audioFiles.length === 0) ? (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 px-2 py-1.5 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                    <span>Your previously uploaded files are saved. You can submit as-is or re-attach new files to replace them.</span>
                  </div>
                ) : null}
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
      <ReleaseSubmissionGateModal open={gateOpen} onOpenChange={setGateOpen} />
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
