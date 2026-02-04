import { supabase } from "../../integrations/supabase/client";
import { 
  sendReleaseApproved, 
  sendReleaseRejected,
  sendTemplateEmail,
  TEMPLATE_RELEASE_SUBMITTED
} from "../../utils/email";

export interface Release {
  id: string;
  title: string;
  cover_art_url: string;
  audio_file_url?: string;
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

export interface Artist {
  id: string;
  name: string;
  email: string;
  status?: string;
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
        audio_file_url,
        status,
        release_date,
        upc,
        isrc,
        artist_id,
        artist_name,
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

// Update release artist name (admin only)
export async function updateReleaseArtistName(releaseId: string, artistName: string) {
  console.log(`Updating artist name for release ${releaseId}: ${artistName}`);
  
  try {
    const { error: updateError } = await supabase
      .from('releases')
      .update({ 
        artist_name: artistName,
        updated_at: new Date().toISOString()
      })
      .eq('id', releaseId);
      
    if (updateError) {
      console.error('Error updating release artist name:', updateError);
      return { success: false, error: updateError };
    }

    // Fetch the updated release
    const { data: updatedRelease, error: fetchError } = await supabase
      .from('releases')
      .select(`
        id,
        title,
        cover_art_url,
        audio_file_url,
        status,
        release_date,
        upc,
        isrc,
        artist_id,
        artist_name,
        artists(id, name, email)
      `)
      .eq('id', releaseId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated release:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Release artist name updated successfully:', updatedRelease);
    return { success: true, data: updatedRelease };
  } catch (error) {
    console.error('Error in updateReleaseArtistName:', error);
    return { success: false, error };
  }
}

// Fetch all artists for admin to select when creating releases
export async function fetchAllArtists(): Promise<Artist[]> {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, email, status')
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching artists:', error);
    return [];
  }
}

// Admin creates release on behalf of an artist
export async function adminCreateRelease(
  artistId: string,
  releaseData: {
    title: string;
    release_date: string;
    release_type?: string;
    genre?: string;
    description?: string;
    platforms?: string[];
    explicit_content?: boolean;
    primary_language?: string;
    producer_credits?: string;
    songwriter_credits?: string;
    artwork_credits?: string;
    copyright_info?: string;
  },
  coverArtUrl?: string | null,
  audioFileUrl?: string | null
) {
  console.log('Admin creating release for artist:', artistId);
  
  try {
    // Get artist info for email notification
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('id, name, email')
      .eq('id', artistId)
      .single();
      
    if (artistError) {
      console.error('Error fetching artist:', artistError);
      return { success: false, error: { message: 'Artist not found' } };
    }
    
    // Create the release
    const { data: insertedRelease, error: releaseError } = await supabase
      .from('releases')
      .insert({
        title: releaseData.title,
        artist_id: artistId,
        release_date: releaseData.release_date,
        release_type: releaseData.release_type || 'single',
        genre: releaseData.genre || null,
        description: releaseData.description || null,
        primary_language: releaseData.primary_language || 'English',
        explicit_content: releaseData.explicit_content || false,
        producer_credits: releaseData.producer_credits || null,
        songwriter_credits: releaseData.songwriter_credits || null,
        artwork_credits: releaseData.artwork_credits || null,
        copyright_info: releaseData.copyright_info || null,
        total_tracks: 1,
        status: 'Pending',
        cover_art_url: coverArtUrl || null,
        platforms: releaseData.platforms || [],
        audio_file_url: audioFileUrl || null,
      })
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
      
    if (releaseError) {
      console.error('Error creating release:', releaseError);
      return { success: false, error: releaseError };
    }
    
    console.log('Release created successfully:', insertedRelease.id);
    
    // Send notification email to the artist/account owner
    if (artistData.email) {
      try {
        console.log('Sending notification to artist:', artistData.email);
        await sendTemplateEmail(artistData.email, TEMPLATE_RELEASE_SUBMITTED, {
          title: releaseData.title,
          artist: artistData.name,
          message: 'An admin has uploaded a new release on your behalf. It is now pending review.',
        });
        console.log('Notification email sent successfully');
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the release creation if email fails
      }
    }
    
    return { success: true, data: insertedRelease };
  } catch (error) {
    console.error('Error in adminCreateRelease:', error);
    return { success: false, error };
  }
}

// Delete a release (admin only)
export async function deleteRelease(releaseId: string) {
  console.log('Deleting release:', releaseId);
  
  try {
    // First get release info for logging
    const { data: releaseData, error: fetchError } = await supabase
      .from('releases')
      .select('id, title, artist_id')
      .eq('id', releaseId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error fetching release:', fetchError);
      return { success: false, error: fetchError };
    }
    
    if (!releaseData) {
      return { success: false, error: { message: 'Release not found' } };
    }
    
    // Delete related records first (tracks, streaming links, etc.)
    const { error: tracksError } = await supabase
      .from('release_tracks')
      .delete()
      .eq('release_id', releaseId);
      
    if (tracksError) {
      console.error('Error deleting release tracks:', tracksError);
      // Continue anyway
    }
    
    const { error: linksError } = await supabase
      .from('streaming_links')
      .delete()
      .eq('release_id', releaseId);
      
    if (linksError) {
      console.error('Error deleting streaming links:', linksError);
      // Continue anyway
    }
    
    const { error: statsError } = await supabase
      .from('performance_statistics')
      .delete()
      .eq('release_id', releaseId);
      
    if (statsError) {
      console.error('Error deleting performance statistics:', statsError);
      // Continue anyway
    }
    
    // Delete the release
    const { error: deleteError } = await supabase
      .from('releases')
      .delete()
      .eq('id', releaseId);
      
    if (deleteError) {
      console.error('Error deleting release:', deleteError);
      return { success: false, error: deleteError };
    }
    
    console.log('Release deleted successfully:', releaseId);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteRelease:', error);
    return { success: false, error };
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