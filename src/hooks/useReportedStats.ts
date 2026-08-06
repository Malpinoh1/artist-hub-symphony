import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MonthlyPoint {
  period_year: number;
  period_month: number;
  streams: number;
  plays: number;
  earnings: number;
}

export interface ReportedSnapshot {
  period_year: number | null;
  period_month: number | null;
  last_updated: string | null;
  period_streams: number;
  period_plays: number;
  period_earnings: number;
  previous_period_streams: number;
  growth_pct: number | null;
  lifetime_streams: number;
  lifetime_plays: number;
  lifetime_earnings: number;
  monthly: MonthlyPoint[];
  top_tracks: Array<{ title: string; streams: number; plays: number; earnings: number }>;
  top_releases: Array<{ release_id: string; title: string; cover_art_url: string | null; streams: number; plays: number; earnings: number }>;
}

export interface ReportedReleaseStats {
  period_year: number | null;
  period_month: number | null;
  last_updated: string | null;
  period_streams: number;
  period_plays: number;
  period_earnings: number;
  lifetime_streams: number;
  lifetime_plays: number;
  lifetime_earnings: number;
  monthly: MonthlyPoint[];
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const formatPeriod = (year?: number | null, month?: number | null) =>
  year && month ? `${MONTH_NAMES[month - 1]} ${year}` : 'No report yet';

export async function fetchArtistReportedSnapshot(artistId: string): Promise<ReportedSnapshot> {
  const { data, error } = await supabase.rpc('get_artist_reported_snapshot' as any, {
    p_artist_id: artistId,
  } as any);
  if (error) throw error;
  return (data || {}) as unknown as ReportedSnapshot;
}

export async function fetchReleaseReportedStats(releaseId: string): Promise<ReportedReleaseStats> {
  const { data, error } = await supabase.rpc('get_release_reported_stats' as any, {
    p_release_id: releaseId,
  } as any);
  if (error) throw error;
  return (data || {}) as unknown as ReportedReleaseStats;
}

export const useArtistReportedSnapshot = (artistId?: string) =>
  useQuery({
    queryKey: ['artist-reported-snapshot', artistId],
    queryFn: () => fetchArtistReportedSnapshot(artistId!),
    enabled: !!artistId,
    staleTime: 5 * 60_000,
  });

export const useReleaseReportedStats = (releaseId?: string) =>
  useQuery({
    queryKey: ['release-reported-stats', releaseId],
    queryFn: () => fetchReleaseReportedStats(releaseId!),
    enabled: !!releaseId,
    staleTime: 5 * 60_000,
  });

export interface Achievement {
  id: string;
  artist_id: string;
  release_id: string | null;
  milestone: number;
  streams_at_award: number;
  awarded_at: string;
}

export const MILESTONES = [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];

export const milestoneLabel = (m: number) =>
  m >= 1_000_000 ? `${m / 1_000_000}M` : m >= 1_000 ? `${m / 1_000}K` : `${m}`;

export const milestoneTier = (m: number) =>
  m >= 1_000_000 ? 'Diamond' : m >= 100_000 ? 'Platinum' : m >= 10_000 ? 'Gold' : m >= 1_000 ? 'Silver' : 'Bronze';

export const useArtistAchievements = (artistId?: string) =>
  useQuery({
    queryKey: ['artist-achievements', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stream_achievements' as any)
        .select('*')
        .eq('artist_id', artistId!)
        .order('milestone', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Achievement[];
    },
    enabled: !!artistId,
    staleTime: 60_000,
  });

export async function runAchievementSweep() {
  const { data, error } = await supabase.functions.invoke('award-achievements', { body: {} });
  if (error) throw error;
  return data as { notified: number; emailed: number };
}
