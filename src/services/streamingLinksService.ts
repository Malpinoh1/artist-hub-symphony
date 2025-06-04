
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
    console.log(`Managing streaming links for release ${releaseId}:`, links);
    
    // First, delete existing links for this release
    const { error: deleteError } = await supabase
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
      
      const { data: insertData, error: insertError } = await supabase
        .from('streaming_links')
        .insert(linksToInsert)
        .select('*');
        
      if (insertError) {
        console.error("Error inserting streaming links:", insertError);
        throw insertError;
      }
      
      console.log("Streaming links inserted successfully:", insertData);
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
    console.log(`Fetching streaming links for release ${releaseId}`);
    
    // Get streaming links for this release
    const { data: streamingLinksData, error: streamingLinksError } = await supabase
      .from('streaming_links')
      .select('*')
      .eq('release_id', releaseId);
      
    if (streamingLinksError) {
      console.error("Error fetching streaming links:", streamingLinksError);
      throw streamingLinksError;
    }
    
    const links = streamingLinksData?.map((link: any) => ({
      platform: link.platform,
      url: link.url
    })) || [];
    
    console.log("Streaming links fetched successfully:", links);
    return links;
    
  } catch (error) {
    console.error('Error fetching streaming links:', error);
    return [];
  }
}
