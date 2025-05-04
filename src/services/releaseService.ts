import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";

export type Release = {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  releaseDate?: string;
  streamingLinks?: { platform: string; url: string }[];
};

export async function fetchUserReleases(userId: string): Promise<Release[]> {
  try {
    // Get the artist record for this user
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (artistError) {
      console.error("Error fetching artist:", artistError);
      return [];
    }

    // If no artist record, return empty array
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
    
    return releases.map(release => ({
      id: release.id,
      title: release.title,
      artist: artistData.name,
      coverArt: release.cover_art_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&h=500&q=80',
      status: mapReleaseStatus(release.status),
      releaseDate: release.release_date,
      // We don't have streaming links in the data model yet, so we'll leave this empty
      streamingLinks: []
    }));
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
    // Get artist data first, which includes total earnings
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('total_earnings')
      .eq('id', userId)
      .maybeSingle();
    
    if (artistError) {
      console.error("Error fetching artist data:", artistError);
      return defaultStats;
    }

    // Get all releases count
    const { count: totalReleases, error: releasesError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId);

    if (releasesError) {
      console.error("Error fetching release counts:", releasesError);
      return { 
        ...defaultStats, 
        totalEarnings: artistData?.total_earnings || 0
      };
    }

    // Get approved releases count
    const { count: activeReleases, error: activeError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId)
      .eq('status', 'Approved');

    if (activeError) {
      console.error("Error fetching active release counts:", activeError);
      return { 
        ...defaultStats, 
        totalReleases: totalReleases || 0,
        totalEarnings: artistData?.total_earnings || 0
      };
    }

    return {
      totalReleases: totalReleases || 0,
      activeReleases: activeReleases || 0,
      totalPlays: 0, // We don't have plays data yet
      totalEarnings: artistData?.total_earnings || 0
    };
  } catch (error) {
    console.error("Unexpected error in fetchUserStats:", error);
    return defaultStats;
  }
}

export async function submitRelease(releaseFormData: any, userId: string, coverArt: File | null, audioFiles: File[]) {
  try {
    // Upload cover art if provided
    let coverArtUrl = null;
    if (coverArt) {
      const coverArtFileName = `${Date.now()}_${coverArt.name}`;
      const { data: coverUploadData, error: coverUploadError } = await supabase.storage
        .from('release_artwork')
        .upload(coverArtFileName, coverArt);
        
      if (coverUploadError) {
        console.error("Error uploading cover art:", coverUploadError);
        throw coverUploadError;
      }
      
      // Get public URL for the uploaded cover art
      const { data: publicUrlData } = supabase.storage
        .from('release_artwork')
        .getPublicUrl(coverArtFileName);
      
      coverArtUrl = publicUrlData?.publicUrl;
    }
    
    // Upload audio files and store their URLs
    let audioFilesUrls = [];
    for (const audioFile of audioFiles) {
      const audioFileName = `${Date.now()}_${audioFile.name}`;
      const { data: audioUploadData, error: audioUploadError } = await supabase.storage
        .from('audio_files')
        .upload(audioFileName, audioFile);
        
      if (audioUploadError) {
        console.error("Error uploading audio file:", audioUploadError);
        throw audioUploadError;
      }
      
      // Get public URL for the uploaded audio file
      const { data: audioUrlData } = supabase.storage
        .from('audio_files')
        .getPublicUrl(audioFileName);
      
      audioFilesUrls.push(audioUrlData?.publicUrl);
    }
    
    // Insert release record - fixed the variable naming conflict here
    const { data: insertedRelease, error: releaseError } = await supabase
      .from('releases')
      .insert({
        title: releaseFormData.title,
        artist_id: userId,
        release_date: releaseFormData.releaseDate,
        status: 'Pending',
        cover_art_url: coverArtUrl,
        platforms: releaseFormData.platforms,
        audio_file_url: audioFilesUrls[0] || null, // Store the first audio URL
        upc: releaseFormData.upc || null,
        // Other relevant fields
      })
      .select()
      .single();
      
    if (releaseError) {
      console.error("Error inserting release:", releaseError);
      throw releaseError;
    }
    
    return { success: true, data: insertedRelease };
      
  } catch (error) {
    console.error('Error submitting release:', error);
    return { success: false, error };
  }
}

// Helper function to map database release status to UI status
function mapReleaseStatus(status: Database["public"]["Enums"]["release_status"] | string): 'pending' | 'approved' | 'rejected' | 'processing' {
  switch(status) {
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'Pending':
    default:
      return 'pending';
  }
}
