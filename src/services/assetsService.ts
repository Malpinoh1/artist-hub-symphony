
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

// Function to download release assets
export async function downloadReleaseAssets(releaseId: string, releaseName: string) {
  try {
    // Get audio file URL from the release
    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .select('audio_file_url')
      .eq('id', releaseId)
      .single();
      
    if (releaseError) {
      throw releaseError;
    }
    
    if (!releaseData.audio_file_url) {
      toast.error('No audio file available for download');
      return { success: false, error: 'No audio file available' };
    }
    
    // Create a temporary anchor to download the file
    const link = document.createElement('a');
    link.href = releaseData.audio_file_url;
    link.download = `${releaseName}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started');
    return { success: true };
  } catch (error) {
    console.error('Error downloading assets:', error);
    toast.error('Failed to download assets');
    return { success: false, error };
  }
}
