
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
    // Get all releases count
    const { count: totalReleases, error: releasesError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId);

    if (releasesError) {
      console.error("Error fetching release counts:", releasesError);
      return defaultStats;
    }

    // Get approved releases count
    const { count: activeReleases, error: activeError } = await supabase
      .from('releases')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', userId)
      .eq('status', 'Approved');

    if (activeError) {
      console.error("Error fetching active release counts:", activeError);
      return { ...defaultStats, totalReleases };
    }

    // Get total earnings
    const { data: earningsData, error: earningsError } = await supabase
      .from('earnings')
      .select('amount')
      .eq('artist_id', userId);

    if (earningsError) {
      console.error("Error fetching earnings:", earningsError);
      return { 
        totalReleases: totalReleases || 0,
        activeReleases: activeReleases || 0,
        totalPlays: 0,
        totalEarnings: 0
      };
    }

    const totalEarnings = earningsData.reduce((sum, earning) => sum + Number(earning.amount), 0);

    return {
      totalReleases: totalReleases || 0,
      activeReleases: activeReleases || 0,
      totalPlays: 0, // We don't have plays data yet
      totalEarnings
    };
  } catch (error) {
    console.error("Unexpected error in fetchUserStats:", error);
    return defaultStats;
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
