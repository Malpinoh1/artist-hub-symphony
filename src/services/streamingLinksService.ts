
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

// Type for streaming links
export type StreamingLink = {
  platform: string;
  url: string;
};

// Create function to add/update streaming links
export async function manageStreamingLinks(releaseId: string, links: StreamingLink[]) {
  try {
    // First, delete existing links for this release
    const { error: deleteError } = await (supabase as any)
      .from('streaming_links')
      .delete()
      .eq('release_id', releaseId);
      
    if (deleteError) {
      console.error("Error deleting existing links:", deleteError);
      throw deleteError;
    }
    
    // Then insert the new links
    if (links.length > 0) {
      const linksToInsert = links.map(link => ({
        release_id: releaseId,
        platform: link.platform,
        url: link.url
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('streaming_links')
        .insert(linksToInsert);
        
      if (insertError) {
        console.error("Error inserting streaming links:", insertError);
        throw insertError;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error managing streaming links:', error);
    return { success: false, error };
  }
}

// Function to fetch streaming links for a release
export async function fetchStreamingLinks(releaseId: string): Promise<StreamingLink[]> {
  try {
    // Get streaming links for this release
    const { data: streamingLinksData, error: streamingLinksError } = await (supabase as any)
      .from('streaming_links')
      .select('*')
      .eq('release_id', releaseId);
      
    if (streamingLinksError) {
      throw streamingLinksError;
    }
    
    return streamingLinksData?.map((link: any) => ({
      platform: link.platform,
      url: link.url
    })) || [];
    
  } catch (error) {
    console.error('Error fetching streaming links:', error);
    return [];
  }
}
