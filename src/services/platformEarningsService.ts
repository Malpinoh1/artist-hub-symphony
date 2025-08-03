import { supabase } from "../integrations/supabase/client";

export interface PlatformEarning {
  id: string;
  artist_id: string;
  release_id?: string;
  platform: string;
  streams: number;
  earnings_amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'processed' | 'paid';
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  // Join fields
  artist_name?: string;
  release_title?: string;
}

export interface RoyaltyStatement {
  id: string;
  artist_id: string;
  statement_number: string;
  period_start: string;
  period_end: string;
  total_streams: number;
  total_earnings: number;
  currency: string;
  status: 'draft' | 'finalized' | 'sent';
  generated_at: string;
  pdf_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Join fields
  artist_name?: string;
}

// Admin functions for managing platform earnings
export async function fetchAllPlatformEarnings(): Promise<PlatformEarning[]> {
  try {
    const { data, error } = await supabase
      .from('platform_earnings')
      .select(`
        *,
        artists:artist_id (
          name
        ),
        releases:release_id (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(earning => ({
      ...earning,
      artist_name: earning.artists?.name,
      release_title: earning.releases?.title,
      status: earning.status as 'pending' | 'processed' | 'paid'
    }));
  } catch (error) {
    console.error('Error fetching platform earnings:', error);
    throw error;
  }
}

export async function createPlatformEarning(earning: Omit<PlatformEarning, 'id' | 'created_at' | 'updated_at'>): Promise<PlatformEarning> {
  try {
    const { data, error } = await supabase
      .from('platform_earnings')
      .insert(earning)
      .select()
      .single();

    if (error) throw error;
    return { ...data, status: data.status as 'pending' | 'processed' | 'paid' };
  } catch (error) {
    console.error('Error creating platform earning:', error);
    throw error;
  }
}

export async function updatePlatformEarning(id: string, updates: Partial<PlatformEarning>): Promise<PlatformEarning> {
  try {
    const { data, error } = await supabase
      .from('platform_earnings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, status: data.status as 'pending' | 'processed' | 'paid' };
  } catch (error) {
    console.error('Error updating platform earning:', error);
    throw error;
  }
}

export async function deletePlatformEarning(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('platform_earnings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting platform earning:', error);
    throw error;
  }
}

// Artist functions for viewing their earnings
export async function fetchArtistPlatformEarnings(artistId: string): Promise<PlatformEarning[]> {
  try {
    const { data, error } = await supabase
      .from('platform_earnings')
      .select(`
        *,
        releases:release_id (
          title
        )
      `)
      .eq('artist_id', artistId)
      .order('period_start', { ascending: false });

    if (error) throw error;

    return (data || []).map(earning => ({
      ...earning,
      release_title: earning.releases?.title,
      status: earning.status as 'pending' | 'processed' | 'paid'
    }));
  } catch (error) {
    console.error('Error fetching artist platform earnings:', error);
    throw error;
  }
}

// Royalty statements functions
export async function fetchAllRoyaltyStatements(): Promise<RoyaltyStatement[]> {
  try {
    const { data, error } = await supabase
      .from('royalty_statements')
      .select(`
        *,
        artists:artist_id (
          name
        )
      `)
      .order('generated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(statement => ({
      ...statement,
      artist_name: statement.artists?.name,
      status: statement.status as 'draft' | 'finalized' | 'sent'
    }));
  } catch (error) {
    console.error('Error fetching royalty statements:', error);
    throw error;
  }
}

export async function fetchArtistRoyaltyStatements(artistId: string): Promise<RoyaltyStatement[]> {
  try {
    const { data, error } = await supabase
      .from('royalty_statements')
      .select('*')
      .eq('artist_id', artistId)
      .order('generated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(statement => ({
      ...statement,
      status: statement.status as 'draft' | 'finalized' | 'sent'
    }));
  } catch (error) {
    console.error('Error fetching artist royalty statements:', error);
    throw error;
  }
}

export async function generateStatementNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `RS-${year}${month}-${timestamp}`;
}

export async function generateRoyaltyStatement(
  artistId: string,
  periodStart: string,
  periodEnd: string
): Promise<RoyaltyStatement> {
  try {
    // Calculate totals from platform earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('platform_earnings')
      .select('streams, earnings_amount')
      .eq('artist_id', artistId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);

    if (earningsError) throw earningsError;

    const totalStreams = earnings?.reduce((sum, e) => sum + e.streams, 0) || 0;
    const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.earnings_amount), 0) || 0;

    const statementNumber = await generateStatementNumber();

    const { data, error } = await supabase
      .from('royalty_statements')
      .insert({
        artist_id: artistId,
        statement_number: statementNumber,
        period_start: periodStart,
        period_end: periodEnd,
        total_streams: totalStreams,
        total_earnings: totalEarnings,
        currency: 'NGN',
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, status: data.status as 'draft' | 'finalized' | 'sent' };
  } catch (error) {
    console.error('Error generating royalty statement:', error);
    throw error;
  }
}

export async function updateRoyaltyStatement(id: string, updates: Partial<RoyaltyStatement>): Promise<RoyaltyStatement> {
  try {
    const { data, error } = await supabase
      .from('royalty_statements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, status: data.status as 'draft' | 'finalized' | 'sent' };
  } catch (error) {
    console.error('Error updating royalty statement:', error);
    throw error;
  }
}