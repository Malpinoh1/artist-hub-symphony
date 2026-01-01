import { supabase } from "../../integrations/supabase/client";
import { 
  sendReleaseApproved, 
  sendReleaseRejected 
} from "../../utils/email";

export interface Release {
  id: string;
  title: string;
  cover_art_url: string;
  status: string;
  release_date: string;
  upc?: string;
  isrc?: string;
  artist_name?: string;
  artist_id?: string;
  artists?: {
    id: string;
    name: string;
    email: string;
  }[];
}

// Fetch all releases for admin dashboard
export async function fetchAdminReleases() {
  try {
    const { data: releasesData, error: releasesError } = await supabase
      .from('releases')
      .select(`
        id,
        title,
        cover_art_url,
        status,
        release_date,
        upc,
        isrc,
        artist_id,
        artists(id, name, email)
      `)
      .order('release_date', { ascending: false });
      
    if (releasesError) throw releasesError;
    return releasesData || [];
  } catch (error) {
    console.error('Error fetching admin releases:', error);
    return [];
  }
}

// Update release status with proper error handling
export async function updateReleaseStatus(
  releaseId: string, 
  newStatus: "Pending" | "Approved" | "Rejected" | "TakeDown" | "TakeDownRequested",
  rejectionReason?: string
) {
  console.log(`Updating release ${releaseId} to status ${newStatus}`);
  
  try {
    // First, check if the release exists
    const { data: existingRelease, error: checkError } = await supabase
      .from('releases')
      .select('id, status')
      .eq('id', releaseId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking release existence:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingRelease) {
      console.error('Release not found');
      return { success: false, error: { message: 'Release not found' } };
    }

    // Build update object
    const updateData: Record<string, any> = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // Add admin notes for rejection
    if (newStatus === 'Rejected' && rejectionReason) {
      updateData.admin_notes = rejectionReason;
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('releases')
      .update(updateData)
      .eq('id', releaseId);
      
    if (updateError) {
      console.error('Error updating release status:', updateError);
      return { success: false, error: updateError };
    }

    // Fetch the updated release with all required data
    const { data: updatedRelease, error: fetchError } = await supabase
      .from('releases')
      .select(`
        id,
        title,
        cover_art_url,
        status,
        release_date,
        upc,
        isrc,
        artist_id,
        admin_notes,
        artists(id, name, email)
      `)
      .eq('id', releaseId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated release:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Release status updated successfully:', updatedRelease);
    
    // Send notification emails based on status change
    if (updatedRelease.artists) {
      const artist = Array.isArray(updatedRelease.artists) 
        ? updatedRelease.artists[0] 
        : updatedRelease.artists;
        
      if (artist && artist.email && artist.name) {
        try {
          if (newStatus === 'Approved') {
            console.log('Release approved, sending notification email');
            const emailResult = await sendReleaseApproved(
              { title: updatedRelease.title, artist: artist.name },
              { email: artist.email, name: artist.name }
            );
            if (emailResult.success) {
              console.log('Approval email sent successfully');
            } else {
              console.error('Failed to send approval email:', emailResult.error);
            }
          } else if (newStatus === 'Rejected') {
            console.log('Release rejected, sending notification email');
            const reason = rejectionReason || updatedRelease.admin_notes || 'Your release did not meet our quality guidelines.';
            const emailResult = await sendReleaseRejected(
              { title: updatedRelease.title, artist: artist.name },
              { email: artist.email, name: artist.name },
              reason
            );
            if (emailResult.success) {
              console.log('Rejection email sent successfully');
            } else {
              console.error('Failed to send rejection email:', emailResult.error);
            }
          }
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          // Don't fail the status update if email fails
        }
      }
    }
    
    return { success: true, data: updatedRelease };
  } catch (error) {
    console.error('Error in updateReleaseStatus:', error);
    return { success: false, error };
  }
}

// Update release UPC and ISRC
export async function updateReleaseIdentifiers(releaseId: string, upc: string, isrc: string) {
  console.log(`Updating identifiers for release ${releaseId}: UPC=${upc}, ISRC=${isrc}`);
  
  try {
    // First, check if the release exists
    const { data: existingRelease, error: checkError } = await supabase
      .from('releases')
      .select('id')
      .eq('id', releaseId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking release existence:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingRelease) {
      console.error('Release not found');
      return { success: false, error: { message: 'Release not found' } };
    }

    // Update the identifiers
    const { error: updateError } = await supabase
      .from('releases')
      .update({ 
        upc: upc || null,
        isrc: isrc || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', releaseId);
      
    if (updateError) {
      console.error('Error updating release identifiers:', updateError);
      return { success: false, error: updateError };
    }

    // Fetch the updated release with all required data
    const { data: updatedRelease, error: fetchError } = await supabase
      .from('releases')
      .select(`
        id,
        title,
        cover_art_url,
        status,
        release_date,
        upc,
        isrc,
        artist_id,
        artists(id, name, email)
      `)
      .eq('id', releaseId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated release:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Release identifiers updated successfully:', updatedRelease);
    return { success: true, data: updatedRelease };
  } catch (error) {
    console.error('Error in updateReleaseIdentifiers:', error);
    return { success: false, error };
  }
}
