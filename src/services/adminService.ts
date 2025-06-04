
import { supabase } from "../integrations/supabase/client";
import { sendReleaseApprovalEmail } from "./emailService";

// Define types for our admin service data
export interface Artist {
  id: string;
  name: string;
  email: string;
  status: string;
  wallet_balance?: number;
  total_earnings?: number;
  available_balance?: number;
  created_at?: string;
}

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

export interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  account_name: string;
  account_number: string;
  bank_name: string;
  artist_id: string;
  artists?: {
    id: string;
    name: string;
    email: string;
  };
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

// Fetch all withdrawals for admin dashboard
export async function fetchAdminWithdrawals() {
  try {
    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        status,
        created_at,
        processed_at,
        account_name,
        account_number,
        bank_name,
        artists(id, name, email)
      `)
      .order('created_at', { ascending: false });
      
    if (withdrawalsError) throw withdrawalsError;
    return withdrawalsData || [];
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    return [];
  }
}

// Fetch all artists for admin dashboard
export async function fetchAdminArtists() {
  try {
    const { data: artistsData, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (artistsError) throw artistsError;
    return artistsData || [];
  } catch (error) {
    console.error('Error fetching admin artists:', error);
    return [];
  }
}

// Fetch count of pending take down requests
export async function fetchTakeDownRequestsCount() {
  try {
    const { count, error: takeDownError } = await supabase
      .from('take_down_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
      
    if (takeDownError) throw takeDownError;
    return count || 0;
  } catch (error) {
    console.error('Error fetching take down requests count:', error);
    return 0;
  }
}

// Update release status - Fixed to handle the database query properly
export async function updateReleaseStatus(releaseId: string, newStatus: "Pending" | "Approved" | "Rejected" | "TakeDown" | "TakeDownRequested") {
  console.log(`Updating release ${releaseId} to status ${newStatus}`);
  
  try {
    // First, check if the release exists
    const { data: existingRelease, error: checkError } = await supabase
      .from('releases')
      .select('id, title, artist_id')
      .eq('id', releaseId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing release:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingRelease) {
      console.error('Release not found');
      return { success: false, error: { message: 'Release not found' } };
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('releases')
      .update({ status: newStatus })
      .eq('id', releaseId);
      
    if (updateError) {
      console.error('Error updating release status:', updateError);
      return { success: false, error: updateError };
    }
    
    // Fetch the updated release with artist info
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
    
    console.log('Release status update successful:', updatedRelease);
    
    // If a release is approved, send notification email to artist
    if (newStatus === 'Approved' && updatedRelease.artists) {
      console.log('Release approved, sending notification email');
      try {
        // Handle both array and single object cases
        const artist = Array.isArray(updatedRelease.artists) ? updatedRelease.artists[0] : updatedRelease.artists;
        if (artist && artist.email && artist.name) {
          await sendReleaseApprovalEmail(
            artist.email,
            artist.name,
            updatedRelease.title,
            updatedRelease.id
          );
          console.log('Approval email sent successfully');
        } else {
          console.warn('Artist data incomplete, skipping email');
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }
    
    return { success: true, data: updatedRelease };
  } catch (error) {
    console.error('Error in updateReleaseStatus:', error);
    return { success: false, error };
  }
}

// Update release UPC and ISRC - Fixed to handle the database query properly
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
      console.error('Error checking existing release:', checkError);
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
        isrc: isrc || null
      })
      .eq('id', releaseId);
      
    if (updateError) {
      console.error('Error updating release identifiers:', updateError);
      return { success: false, error: updateError };
    }
    
    // Fetch the updated release
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

// Update withdrawal status - Fixed to handle the database query properly
export async function updateWithdrawalStatus(id: string, status: string) {
  try {
    // First, check if the withdrawal exists
    const { data: existingWithdrawal, error: checkError } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing withdrawal:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingWithdrawal) {
      console.error('Withdrawal not found');
      return { success: false, error: { message: 'Withdrawal not found' } };
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ 
        status,
        processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
      })
      .eq('id', id);
      
    if (updateError) {
      console.error('Error updating withdrawal status:', updateError);
      return { success: false, error: updateError };
    }
    
    // Fetch the updated withdrawal
    const { data: updatedWithdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        status,
        created_at,
        processed_at,
        account_name,
        account_number,
        bank_name,
        artists(id, name, email)
      `)
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated withdrawal:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Withdrawal status updated successfully:', updatedWithdrawal);
    return { success: true, data: updatedWithdrawal };
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return { success: false, error };
  }
}

// Update artist status - Fixed to handle the database query properly
export async function updateArtistStatus(id: string, status: string) {
  try {
    // First, check if the artist exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing artist:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingArtist) {
      console.error('Artist not found');
      return { success: false, error: { message: 'Artist not found' } };
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('artists')
      .update({ status })
      .eq('id', id);
      
    if (updateError) {
      console.error('Error updating artist status:', updateError);
      return { success: false, error: updateError };
    }
    
    // Fetch the updated artist
    const { data: updatedArtist, error: fetchError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated artist:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Artist status updated successfully:', updatedArtist);
    return { success: true, data: updatedArtist };
  } catch (error) {
    console.error('Error updating artist status:', error);
    return { success: false, error };
  }
}

// Fetch summary of artists' earnings
export async function fetchArtistsEarningSummary() {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, email, wallet_balance, total_earnings, available_balance')
      .order('total_earnings', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching artists earnings summary:', error);
    return [];
  }
}

export async function updateArtistEarnings(
  artistId: string, 
  totalEarnings: number, 
  availableBalance: number, 
  walletBalance: number
) {
  console.log(`Updating earnings for artist ${artistId}:`, {
    totalEarnings,
    availableBalance,
    walletBalance
  });
  
  try {
    // First, check if the artist exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', artistId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing artist:', checkError);
      return { success: false, error: checkError };
    }

    if (!existingArtist) {
      console.error('Artist not found');
      return { success: false, error: { message: 'Artist not found' } };
    }

    // Update the earnings
    const { error: updateError } = await supabase
      .from('artists')
      .update({ 
        total_earnings: totalEarnings,
        available_balance: availableBalance,
        wallet_balance: walletBalance
      })
      .eq('id', artistId);
      
    if (updateError) {
      console.error('Error updating artist earnings:', updateError);
      return { success: false, error: updateError };
    }
    
    // Fetch the updated artist
    const { data: updatedArtist, error: fetchError } = await supabase
      .from('artists')
      .select('id, name, email, wallet_balance, total_earnings, available_balance')
      .eq('id', artistId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated artist:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('Artist earnings updated successfully:', updatedArtist);
    return { success: true, data: updatedArtist };
  } catch (error) {
    console.error('Error in updateArtistEarnings:', error);
    return { success: false, error };
  }
}
