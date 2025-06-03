
import { supabase } from "../integrations/supabase/client";

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

// Update release status - Fixed to properly handle the status update and return updated data
export async function updateReleaseStatus(releaseId: string, newStatus: "Pending" | "Approved" | "Rejected" | "TakeDown" | "TakeDownRequested") {
  console.log(`Updating release ${releaseId} to status ${newStatus}`);
  
  try {
    // Update the status and return the updated row
    const { data, error } = await supabase
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
      
    if (error) {
      console.error('Error updating release status:', error);
      return { success: false, error };
    }
    
    if (!data) {
      console.error('No data returned after release status update');
      return { success: false, error: 'No data returned' };
    }
    
    console.log('Release status update successful:', data);
    
    // If a release is approved, send notification email to artist
    if (newStatus === 'Approved') {
      console.log('Release approved, notification could be sent');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateReleaseStatus:', error);
    return { success: false, error };
  }
}

// Update release UPC and ISRC - Fixed to return updated data
export async function updateReleaseIdentifiers(releaseId: string, upc: string, isrc: string) {
  console.log(`Updating identifiers for release ${releaseId}: UPC=${upc}, ISRC=${isrc}`);
  
  try {
    // Update the identifiers and return the updated row
    const { data, error } = await supabase
      .from('releases')
      .update({ 
        upc,
        isrc
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
      
    if (error) {
      console.error('Error updating release identifiers:', error);
      return { success: false, error };
    }
    
    if (!data) {
      console.error('No data returned after identifier update');
      return { success: false, error: 'No data returned' };
    }
    
    console.log('Release identifiers updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateReleaseIdentifiers:', error);
    return { success: false, error };
  }
}

// Update withdrawal status - Fixed to return updated data
export async function updateWithdrawalStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({ 
        status,
        processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
      })
      .eq('id', id)
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
      .single();
      
    if (error) {
      console.error('Error updating withdrawal status:', error);
      return { success: false, error };
    }
    
    if (!data) {
      console.error('No data returned after withdrawal status update');
      return { success: false, error: 'No data returned' };
    }
    
    console.log('Withdrawal status updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return { success: false, error };
  }
}

// Update artist status - Fixed to return updated data
export async function updateArtistStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('artists')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error updating artist status:', error);
      return { success: false, error };
    }
    
    if (!data) {
      console.error('No data returned after artist status update');
      return { success: false, error: 'No data returned' };
    }
    
    console.log('Artist status updated successfully:', data);
    return { success: true, data };
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

// Update artist earnings - Fixed to return updated data
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
    // Update the earnings and return the updated row
    const { data, error } = await supabase
      .from('artists')
      .update({ 
        total_earnings: totalEarnings,
        available_balance: availableBalance,
        wallet_balance: walletBalance
      })
      .eq('id', artistId)
      .select('id, name, email, wallet_balance, total_earnings, available_balance')
      .single();
      
    if (error) {
      console.error('Error updating artist earnings:', error);
      return { success: false, error };
    }
    
    if (!data) {
      console.error('No data returned after earnings update');
      return { success: false, error: 'No data returned' };
    }
    
    console.log('Artist earnings updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateArtistEarnings:', error);
    return { success: false, error };
  }
}
