
import { supabase } from "../../integrations/supabase/client";

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

// Update artist status
export async function updateArtistStatus(id: string, status: string) {
  try {
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artists')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
      
    if (updateError) {
      console.error('Error updating artist status:', updateError);
      return { success: false, error: updateError };
    }

    if (!updatedArtist) {
      console.error('No artist returned after update');
      return { success: false, error: { message: 'No artist returned after update' } };
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

// Update artist earnings
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
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artists')
      .update({ 
        total_earnings: totalEarnings,
        available_balance: availableBalance,
        wallet_balance: walletBalance
      })
      .eq('id', artistId)
      .select('id, name, email, wallet_balance, total_earnings, available_balance')
      .single();
      
    if (updateError) {
      console.error('Error updating artist earnings:', updateError);
      return { success: false, error: updateError };
    }

    if (!updatedArtist) {
      console.error('No artist returned after earnings update');
      return { success: false, error: { message: 'No artist returned after update' } };
    }
    
    console.log('Artist earnings updated successfully:', updatedArtist);
    return { success: true, data: updatedArtist };
  } catch (error) {
    console.error('Error in updateArtistEarnings:', error);
    return { success: false, error };
  }
}
