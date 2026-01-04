
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

// Re-export everything from the modular admin services
export * from './admin/releaseService';
export * from './admin/withdrawalService';
export * from './admin/artistService';
export * from './admin/otherService';

// Re-export specific functions that are commonly used
export { 
  fetchAdminReleases, 
  updateReleaseStatus, 
  updateReleaseIdentifiers, 
  deleteRelease, 
  adminCreateRelease,
  fetchAllArtists 
} from './admin/releaseService';
