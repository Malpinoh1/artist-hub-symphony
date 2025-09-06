
import { supabase } from "../../integrations/supabase/client";

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

// Re-export artist earnings function that is also used in admin dashboard
export { fetchArtistsEarningSummary } from './artistService';
