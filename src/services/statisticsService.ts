
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
  try {
    // Check if stats already exist for this release
    const { data: existingStats, error: checkError } = await (supabase as any)
      .from('performance_statistics')
      .select('id')
      .eq('release_id', releaseId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking existing stats:", checkError);
      throw checkError;
    }
    
    if (existingStats) {
      // Update existing stats
      const { error: updateError } = await (supabase as any)
        .from('performance_statistics')
        .update({
          ...stats,
          date: new Date().toISOString()
        })
        .eq('id', existingStats.id);
        
      if (updateError) {
        console.error("Error updating statistics:", updateError);
        throw updateError;
      }
    } else {
      // Insert new stats
      const { error: insertError } = await (supabase as any)
        .from('performance_statistics')
        .insert({
          release_id: releaseId,
          ...stats,
          date: new Date().toISOString()
        });
        
      if (insertError) {
        console.error("Error inserting statistics:", insertError);
        throw insertError;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error managing performance statistics:', error);
    return { success: false, error };
  }
}

// Function to fetch statistics for a release
export async function fetchReleaseStatistics(releaseId: string): Promise<PerformanceStatistics | null> {
  try {
    // Get performance statistics for this release
    const { data: statsData, error: statsError } = await (supabase as any)
      .from('performance_statistics')
      .select('*')
      .eq('release_id', releaseId)
      .order('date', { ascending: false })
      .maybeSingle();
      
    if (statsError) {
      throw statsError;
    }
    
    return statsData || null;
    
  } catch (error) {
    console.error('Error fetching release statistics:', error);
    return null;
  }
}
