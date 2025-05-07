
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

    // Get all streaming links for these releases
    const releaseIds = releases.map(release => release.id);
    let streamingLinks = [];
    
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
      // Filter streaming links for this release
      const releaseLinks = streamingLinks
        .filter((link: any) => link.release_id === release.id)
        .map((link: any) => ({
          platform: link.platform,
          url: link.url
        }));
      
      return {
        id: release.id,
        title: release.title,
        artist: artistData.name,
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
    // Get user email for notification
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error fetching user data:", userError);
      throw userError;
    }
    
    const userEmail = userData.user.email;

    // Upload cover art if provided
    let coverArtUrl = null;
    if (coverArt) {
      // Create folder path with user ID to avoid filename conflicts
      const folderPath = `${userId}`;
      const coverArtFileName = `${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
      const coverArtPath = `${folderPath}/${coverArtFileName}`;
      
      const { data: coverUploadData, error: coverUploadError } = await supabase.storage
        .from('release_artwork')
        .upload(coverArtPath, coverArt, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (coverUploadError) {
        console.error("Error uploading cover art:", coverUploadError);
        toast.error("Failed to upload cover art. Please try again.");
        throw coverUploadError;
      }
      
      // Get public URL for the uploaded cover art
      const { data: publicUrlData } = supabase.storage
        .from('release_artwork')
        .getPublicUrl(coverArtPath);
      
      coverArtUrl = publicUrlData?.publicUrl;
    }
    
    // Upload audio files and store their URLs
    let audioFilesUrls = [];
    for (const audioFile of audioFiles) {
      // Create folder path with user ID to avoid filename conflicts
      const folderPath = `${userId}`;
      const audioFileName = `${Date.now()}_audio.${audioFile.name.split('.').pop()}`;
      const audioPath = `${folderPath}/${audioFileName}`;
      
      const { data: audioUploadData, error: audioUploadError } = await supabase.storage
        .from('audio_files')
        .upload(audioPath, audioFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (audioUploadError) {
        console.error("Error uploading audio file:", audioUploadError);
        toast.error("Failed to upload audio file. Please try again.");
        throw audioUploadError;
      }
      
      // Get public URL for the uploaded audio file
      const { data: audioUrlData } = supabase.storage
        .from('audio_files')
        .getPublicUrl(audioPath);
      
      audioFilesUrls.push(audioUrlData?.publicUrl);
    }
    
    // Get artist name for email notification
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('name')
      .eq('id', userId)
      .single();
      
    if (artistError) {
      console.error("Error fetching artist data:", artistError);
      throw artistError;
    }
    
    // Insert release record
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
        isrc: releaseFormData.isrc || null,
      })
      .select()
      .single();
      
    if (releaseError) {
      console.error("Error inserting release:", releaseError);
      toast.error("Failed to submit release. Please try again.");
      throw releaseError;
    }
    
    // Send confirmation email
    if (userEmail) {
      await sendReleaseSubmissionEmail(userEmail, releaseFormData.title, artistData.name);
    }
    
    toast.success("Release submitted successfully!");
    return { success: true, data: insertedRelease };
      
  } catch (error) {
    console.error('Error submitting release:', error);
    return { success: false, error };
  }
}

// Helper function to map database release status to UI status
export function mapReleaseStatus(status: Database["public"]["Enums"]["release_status"] | string): 'pending' | 'approved' | 'rejected' | 'processing' | 'takedown' | 'takedownrequested' {
  switch(status) {
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'Processing':
      return 'processing';
    case 'TakeDown':
      return 'takedown';
    case 'TakeDownRequested':
      return 'takedownrequested';
    case 'Pending':
    default:
      return 'pending';
  }
}

// Function to fetch a single release with streaming links and stats
export async function fetchReleaseDetails(releaseId: string): Promise<Release | null> {
  try {
    // Get release information
    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
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

    // Get streaming links for this release
    const streamingLinks = await fetchStreamingLinks(releaseId);
    
    // Get performance statistics for this release
    const { data: statsData, error: statsError } = await (supabase as any)
      .from('performance_statistics')
      .select('*')
      .eq('release_id', releaseId)
      .order('date', { ascending: false })
      .maybeSingle();
    
    const statistics = !statsError && statsData ? statsData : null;
    
    return {
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
  } catch (error) {
    console.error('Error fetching release details:', error);
    return null;
  }
}
