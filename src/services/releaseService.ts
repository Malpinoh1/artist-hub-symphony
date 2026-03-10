import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";
import { toast } from "sonner";
import { fetchStreamingLinks, StreamingLink } from "./streamingLinksService";
import { PerformanceStatistics } from "./statisticsService";
import { sendReleaseSubmissionEmail } from "./emailService";

export type Release = {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested';
  releaseDate?: string;
  streamingLinks?: StreamingLink[];
  upc?: string;
  isrc?: string;
  statistics?: PerformanceStatistics | null;
  release_type?: string;
  genre?: string;
  description?: string;
  producer_credits?: string;
  songwriter_credits?: string;
  artwork_credits?: string;
  copyright_info?: string;
  primary_language?: string;
  total_tracks?: number;
  explicit_content?: boolean;
  submission_notes?: string;
  platforms?: string[];
  territory?: string;
  release_time?: string;
  release_timezone?: string;
  pre_order_enabled?: boolean;
  pre_order_previews?: boolean;
  pricing?: string;
  tracks?: Array<{
    id?: string;
    track_number: number;
    title: string;
    duration?: number | null;
    isrc?: string | null;
    explicit_content?: boolean;
    featured_artists?: string[];
  }>;
  storeSelections?: Array<{
    id: string;
    store_name: string;
    store_category: string;
    enabled: boolean;
    status: string;
  }>;
  audioClips?: Array<{
    id: string;
    track_id: string;
    clip_start: number;
    clip_end: number;
    clip_type: string;
  }>;
  freeTracks?: Array<{
    id: string;
    track_id: string;
  }>;
};

export async function fetchUserReleases(userId: string): Promise<Release[]> {
  try {
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (artistError) {
      console.error("Error fetching artist:", artistError);
      return [];
    }

    if (!artistData) return [];

    const { data: releases, error } = await supabase
      .from('releases')
      .select('*')
      .eq('artist_id', userId)
      .order('release_date', { ascending: false });

    if (error) {
      console.error("Error fetching releases:", error);
      return [];
    }

    const releaseIds = releases.map(release => release.id);
    let streamingLinks: any[] = [];
    
    if (releaseIds.length > 0) {
      const { data: linksData, error: linksError } = await (supabase as any)
        .from('streaming_links')
        .select('*')
        .in('release_id', releaseIds);
        
      if (!linksError && linksData) {
        streamingLinks = linksData;
      }
    }
    
    return releases.map(release => {
      const releaseLinks = streamingLinks
        .filter((link: any) => link.release_id === release.id)
        .map((link: any) => ({
          platform: link.platform,
          url: link.url
        }));
      
      const displayArtistName = (release as any).artist_name || artistData.name;
      
      return {
        id: release.id,
        title: release.title,
        artist: displayArtistName,
        coverArt: release.cover_art_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80',
        status: mapReleaseStatus(release.status),
        releaseDate: release.release_date,
        streamingLinks: releaseLinks,
        upc: release.upc,
        isrc: release.isrc
      };
    });
  } catch (error) {
    console.error("Unexpected error in fetchUserReleases:", error);
    return [];
  }
}

export async function fetchUserStats(userId: string) {
  const defaultStats = {
    totalReleases: 0,
    activeReleases: 0,
    totalPlays: 0,
    totalEarnings: 0
  };

  try {
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('total_earnings')
      .eq('id', userId)
      .maybeSingle();
    
    if (artistError) {
      console.error("Error fetching artist data:", artistError);
      return defaultStats;
    }

    const { count: totalReleases, error: releasesError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId);

    if (releasesError) {
      return { ...defaultStats, totalEarnings: artistData?.total_earnings || 0 };
    }

    const { count: activeReleases, error: activeError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId)
      .eq('status', 'Approved');

    if (activeError) {
      return { ...defaultStats, totalReleases: totalReleases || 0, totalEarnings: artistData?.total_earnings || 0 };
    }

    return {
      totalReleases: totalReleases || 0,
      activeReleases: activeReleases || 0,
      totalPlays: 0,
      totalEarnings: artistData?.total_earnings || 0
    };
  } catch (error) {
    console.error("Unexpected error in fetchUserStats:", error);
    return defaultStats;
  }
}

type UploadProgress = {
  step: 'idle' | 'cover' | 'audio' | 'saving' | 'done';
  currentFile?: string;
  currentIndex?: number;
  totalFiles?: number;
};

export async function submitRelease(
  releaseFormData: any, 
  userId: string, 
  coverArt: File | null, 
  audioFiles: File[], 
  tracksData: any[] = [],
  onProgress?: (progress: UploadProgress) => void,
  artistNameOverride?: string
) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error("Authentication failed.");
    if (!userData.user?.email) throw new Error("User email not found.");
    
    const userEmail = userData.user.email;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    
    const artistName = artistNameOverride || profileData?.full_name || userEmail.split('@')[0];
    
    let { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
      
    if (artistError) throw new Error("Failed to verify artist information.");
    
    if (!artistData) {
      const { data: newArtistData, error: createArtistError } = await supabase
        .from('artists')
        .insert({ id: userId, name: artistName, email: userEmail })
        .select('name')
        .single();
        
      if (createArtistError) throw new Error("Failed to create artist profile.");
      artistData = newArtistData;
    }

    const releaseArtistName = artistNameOverride || artistData.name;

    let coverArtUrl = null;
    if (coverArt) {
      onProgress?.({ step: 'cover', currentFile: coverArt.name });
      const coverArtPath = `${userId}/${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
      const { error: coverUploadError } = await supabase.storage
        .from('release_artwork')
        .upload(coverArtPath, coverArt, { cacheControl: '3600', upsert: false });
      if (coverUploadError) throw new Error(`Failed to upload cover art: ${coverUploadError.message}`);
      const { data: publicUrlData } = supabase.storage.from('release_artwork').getPublicUrl(coverArtPath);
      coverArtUrl = publicUrlData?.publicUrl;
    }
    
    let audioFilesUrls: string[] = [];
    if (audioFiles && audioFiles.length > 0) {
      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        onProgress?.({ step: 'audio', currentFile: audioFile.name, currentIndex: i + 1, totalFiles: audioFiles.length });
        const audioPath = `${userId}/${Date.now()}_${i}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: audioUploadError } = await supabase.storage
          .from('audio_files')
          .upload(audioPath, audioFile, { cacheControl: '3600', upsert: false });
        if (audioUploadError) throw new Error(`Failed to upload audio file "${audioFile.name}": ${audioUploadError.message}`);
        const { data: audioUrlData } = supabase.storage.from('audio_files').getPublicUrl(audioPath);
        audioFilesUrls.push(audioUrlData?.publicUrl || '');
      }
    }
    
    onProgress?.({ step: 'saving' });
    
    const { data: insertedRelease, error: releaseError } = await supabase
      .from('releases')
      .insert({
        title: releaseFormData.title,
        artist_id: userId,
        artist_name: releaseArtistName,
        release_date: releaseFormData.release_date,
        release_type: releaseFormData.release_type,
        genre: releaseFormData.genre,
        description: releaseFormData.description,
        primary_language: releaseFormData.primary_language,
        explicit_content: releaseFormData.explicit_content,
        producer_credits: releaseFormData.producer_credits,
        songwriter_credits: releaseFormData.songwriter_credits,
        artwork_credits: releaseFormData.artwork_credits,
        copyright_info: releaseFormData.copyright_info,
        submission_notes: releaseFormData.submission_notes,
        total_tracks: releaseFormData.total_tracks,
        status: 'Pending',
        cover_art_url: coverArtUrl,
        platforms: releaseFormData.platforms || [],
        audio_file_url: audioFilesUrls[0] || null,
        upc: releaseFormData.upc || null,
        isrc: releaseFormData.isrc || null,
      })
      .select()
      .single();
      
    if (releaseError) throw new Error("Failed to submit release.");

    if (tracksData && tracksData.length > 0) {
      const trackRecords = tracksData.map((track, index) => ({
        release_id: insertedRelease.id,
        track_number: track.track_number || (index + 1),
        title: track.title,
        duration: track.duration,
        isrc: track.isrc,
        explicit_content: track.explicit_content || false,
        featured_artists: track.featured_artists || []
      }));

      await supabase.from('release_tracks').insert(trackRecords);
    }
    
    try {
      await sendReleaseSubmissionEmail(userEmail, releaseFormData.title, releaseArtistName);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }
    
    toast.success("Release submitted successfully!");
    return { success: true, data: insertedRelease };
      
  } catch (error) {
    console.error('Error submitting release:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

export function mapReleaseStatus(status: Database["public"]["Enums"]["release_status"] | string): 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested' {
  switch(status) {
    case 'Approved': return 'approved';
    case 'Rejected': return 'rejected';
    case 'Processing': return 'processing';
    case 'TakeDown': return 'takedown';
    case 'TakeDownRequested': return 'takedownrequested';
    case 'Pending':
    default: return 'pending';
  }
}

export async function fetchReleaseDetails(releaseId: string): Promise<Release | null> {
  try {
    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (releaseError) throw releaseError;

    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('name')
      .eq('id', releaseData.artist_id)
      .single();

    if (artistError) throw artistError;

    const streamingLinks = await fetchStreamingLinks(releaseId);
    
    const { data: statsData, error: statsError } = await (supabase as any)
      .from('performance_statistics')
      .select('*')
      .eq('release_id', releaseId)
      .order('date', { ascending: false })
      .maybeSingle();
    
    const statistics = !statsError && statsData ? statsData : null;

    const { data: trackData, error: tracksError } = await supabase
      .from('release_tracks')
      .select('id, track_number, title, duration, isrc, explicit_content, featured_artists')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true });

    const tracks = tracksError || !trackData ? [] : trackData;

    // Fetch store selections
    const { data: storeData } = await supabase
      .from('release_store_selections')
      .select('id, store_name, store_category, enabled, status')
      .eq('release_id', releaseId);

    // Fetch audio clips
    const { data: clipData } = await supabase
      .from('release_audio_clips')
      .select('id, track_id, clip_start, clip_end, clip_type')
      .eq('release_id', releaseId);

    // Fetch free tracks
    const { data: freeTrackData } = await supabase
      .from('release_free_tracks')
      .select('id, track_id')
      .eq('release_id', releaseId);
    
    const displayArtistName = releaseData.artist_name || artistData.name;
    
    return {
      id: releaseData.id,
      title: releaseData.title,
      artist: displayArtistName,
      coverArt: releaseData.cover_art_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80',
      status: mapReleaseStatus(releaseData.status),
      releaseDate: releaseData.release_date,
      streamingLinks: streamingLinks,
      upc: releaseData.upc || 'Not assigned',
      isrc: releaseData.isrc || 'Not assigned',
      statistics: statistics,
      release_type: releaseData.release_type,
      genre: releaseData.genre,
      description: releaseData.description,
      producer_credits: releaseData.producer_credits,
      songwriter_credits: releaseData.songwriter_credits,
      artwork_credits: releaseData.artwork_credits,
      copyright_info: releaseData.copyright_info,
      primary_language: releaseData.primary_language,
      total_tracks: releaseData.total_tracks,
      explicit_content: releaseData.explicit_content,
      submission_notes: releaseData.submission_notes,
      platforms: releaseData.platforms || [],
      territory: releaseData.territory,
      release_time: releaseData.release_time,
      release_timezone: releaseData.release_timezone,
      pre_order_enabled: releaseData.pre_order_enabled,
      pre_order_previews: releaseData.pre_order_previews,
      pricing: releaseData.pricing,
      tracks: tracks,
      storeSelections: storeData || [],
      audioClips: clipData || [],
      freeTracks: freeTrackData || [],
    };
  } catch (error) {
    console.error('Error fetching release details:', error);
    return null;
  }
}
