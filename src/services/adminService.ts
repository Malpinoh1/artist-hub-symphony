
import { supabase } from "../integrations/supabase/client";

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
        artists(id, name, email)
      `)
      .order('created_at', { ascending: false });
      
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

// Update release status
export async function updateReleaseStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('releases')
      .update({ status })
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating release status:', error);
    return { success: false, error };
  }
}

// Update withdrawal status
export async function updateWithdrawalStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ 
        status,
        processed_at: status === 'COMPLETED' ? new Date().toISOString() : null
      })
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return { success: false, error };
  }
}

// Update artist status
export async function updateArtistStatus(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('artists')
      .update({ status })
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating artist status:', error);
    return { success: false, error };
  }
}
