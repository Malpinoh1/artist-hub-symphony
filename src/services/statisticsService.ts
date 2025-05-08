
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

// Create function to add/update performance statistics - Fixed with better error handling and logging
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
        .select();
        
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
        .select();
        
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
