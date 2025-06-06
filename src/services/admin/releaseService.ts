
import { supabase } from "../../integrations/supabase/client";
import { sendReleaseApprovalEmail } from "../emailService";

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
export async function updateReleaseStatus(releaseId: string, newStatus: "Pending" | "Approved" | "Rejected" | "TakeDown" | "TakeDownRequested") {
  console.log(`Updating release ${releaseId} to status ${newStatus}`);
  
  try {
    // Update the status
    const { data: updateData, error: updateError } = await supabase
      .from('releases')
      .update({ status: newStatus })
      .eq('id', releaseId)
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
      .single();
      
    if (updateError) {
      console.error('Error updating release status:', updateError);
      return { success: false, error: updateError };
    }

    if (!updateData) {
      console.error('No release found after update');
      return { success: false, error: { message: 'No release found after update' } };
    }
    
    console.log('Release status updated successfully:', updateData);
    
    // If a release is approved, send notification email to artist
    if (newStatus === 'Approved' && updateData.artists) {
      console.log('Release approved, sending notification email');
      try {
        const artist = Array.isArray(updateData.artists) ? updateData.artists[0] : updateData.artists;
        if (artist && artist.email && artist.name) {
          await sendReleaseApprovalEmail(
            artist.email,
            artist.name,
            updateData.title,
            updateData.id
          );
          console.log('Approval email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }
    }
    
    return { success: true, data: updateData };
  } catch (error) {
    console.error('Error in updateReleaseStatus:', error);
    return { success: false, error };
  }
}

// Update release UPC and ISRC
export async function updateReleaseIdentifiers(releaseId: string, upc: string, isrc: string) {
  console.log(`Updating identifiers for release ${releaseId}: UPC=${upc}, ISRC=${isrc}`);
  
  try {
    // Update the identifiers
    const { data: updateData, error: updateError } = await supabase
      .from('releases')
      .update({ 
        upc: upc || null,
        isrc: isrc || null
      })
      .eq('id', releaseId)
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
      .single();
      
    if (updateError) {
      console.error('Error updating release identifiers:', updateError);
      return { success: false, error: updateError };
    }

    if (!updateData) {
      console.error('No release found after identifier update');
      return { success: false, error: { message: 'No release found after update' } };
    }
    
    console.log('Release identifiers updated successfully:', updateData);
    return { success: true, data: updateData };
  } catch (error) {
    console.error('Error in updateReleaseIdentifiers:', error);
    return { success: false, error };
  }
}
