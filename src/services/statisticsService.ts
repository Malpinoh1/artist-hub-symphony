
import { supabase } from "../integrations/supabase/client";

// Type for performance statistics
export type PerformanceStatistics = {
  id: string;
  total_streams: number;
  spotify_streams: number;
  apple_music_streams: number;
  youtube_music_streams: number;
  other_streams: number;
  date: string;
};

// Create function to add/update performance statistics
export async function updatePerformanceStatistics(
  releaseId: string, 
  stats: {
    total_streams: number,
    spotify_streams: number,
    apple_music_streams: number,
    youtube_music_streams: number,
    other_streams: number
  }
) {
  console.log(`Updating performance statistics for release ${releaseId}:`, stats);
  
  try {
    // Check if stats already exist for this release
    const { data: existingStats, error: checkError } = await supabase
      .from('performance_statistics')
      .select('id')
      .eq('release_id', releaseId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking existing stats:", checkError);
      throw checkError;
    }
    
    let result;
    
    if (existingStats) {
      // Update existing stats
      console.log(`Found existing stats with ID ${existingStats.id}, updating...`);
      const { data, error: updateError } = await supabase
        .from('performance_statistics')
        .update({
          ...stats,
          date: new Date().toISOString()
        })
        .eq('id', existingStats.id)
        .select('*')
        .single();
        
      if (updateError) {
        console.error("Error updating statistics:", updateError);
        throw updateError;
      }
      
      result = data;
      console.log("Statistics updated successfully:", data);
    } else {
      // Insert new stats
      console.log("No existing stats found, creating new record...");
      const { data, error: insertError } = await supabase
        .from('performance_statistics')
        .insert({
          release_id: releaseId,
          ...stats,
          date: new Date().toISOString()
        })
        .select('*')
        .single();
        
      if (insertError) {
        console.error("Error inserting statistics:", insertError);
        throw insertError;
      }
      
      result = data;
      console.log("Statistics created successfully:", data);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error managing performance statistics:', error);
    return { success: false, error };
  }
}

// Function to fetch statistics for a release
export async function fetchReleaseStatistics(releaseId: string): Promise<PerformanceStatistics | null> {
  try {
    console.log(`Fetching statistics for release ${releaseId}`);
    
    // Get performance statistics for this release
    const { data: statsData, error: statsError } = await supabase
      .from('performance_statistics')
      .select('*')
      .eq('release_id', releaseId)
      .order('date', { ascending: false })
      .maybeSingle();
      
    if (statsError) {
      console.error("Error fetching statistics:", statsError);
      throw statsError;
    }
    
    console.log("Statistics fetched successfully:", statsData);
    return statsData || null;
    
  } catch (error) {
    console.error('Error fetching release statistics:', error);
    return null;
  }
}

// Function to fetch all platform analytics
export async function fetchPlatformAnalytics() {
  try {
    const { data, error } = await supabase
      .from('platform_analytics')
      .select('*')
      .single();
      
    if (error) {
      console.error("Error fetching platform analytics:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return null;
  }
}

// Function to update platform analytics
export async function updatePlatformAnalytics(analyticsData: {
  spotify_plays: number;
  spotify_growth: number;
  apple_music_plays: number;
  apple_music_growth: number;
  youtube_music_plays: number;
  youtube_music_growth: number;
  deezer_plays: number;
  deezer_growth: number;
}) {
  try {
    console.log("Updating platform analytics:", analyticsData);
    
    const { data, error } = await supabase
      .from('platform_analytics')
      .upsert({
        ...analyticsData,
        last_updated: new Date().toISOString()
      })
      .select('*')
      .single();
      
    if (error) {
      console.error("Error updating platform analytics:", error);
      throw error;
    }
    
    console.log("Platform analytics updated successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating platform analytics:', error);
    return { success: false, error };
  }
}
