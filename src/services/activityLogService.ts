import { supabase } from '../integrations/supabase/client';
import { Json } from '../integrations/supabase/types';

export interface ActivityLog {
  id: string;
  artist_id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Json;
  created_at: string;
}

export type ActivityType = 
  | 'withdrawal_requested'
  | 'withdrawal_approved'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'earnings_added'
  | 'release_submitted'
  | 'release_approved'
  | 'release_rejected'
  | 'team_member_added'
  | 'team_member_removed'
  | 'profile_updated';

export async function logActivity(
  artistId: string,
  userId: string,
  activityType: ActivityType,
  title: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        artist_id: artistId,
        user_id: userId,
        activity_type: activityType,
        title,
        description: description || null,
        metadata: metadata || {}
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error };
  }
}

export async function fetchActivityLogs(
  artistId: string,
  limit: number = 20
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

export function subscribeToActivityLogs(
  artistId: string,
  callback: (log: ActivityLog) => void
) {
  const channel = supabase
    .channel(`activity-logs-${artistId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `artist_id=eq.${artistId}`
      },
      (payload) => {
        callback(payload.new as ActivityLog);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getActivityIcon(activityType: string): string {
  switch (activityType) {
    case 'withdrawal_requested':
      return '💸';
    case 'withdrawal_approved':
      return '✅';
    case 'withdrawal_completed':
      return '🎉';
    case 'withdrawal_rejected':
      return '❌';
    case 'earnings_added':
      return '💰';
    case 'release_submitted':
      return '🎵';
    case 'release_approved':
      return '✨';
    case 'release_rejected':
      return '🚫';
    case 'team_member_added':
      return '👥';
    case 'team_member_removed':
      return '👤';
    case 'profile_updated':
      return '✏️';
    default:
      return '📌';
  }
}

export function getActivityColor(activityType: string): string {
  switch (activityType) {
    case 'withdrawal_requested':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'withdrawal_approved':
    case 'release_approved':
    case 'withdrawal_completed':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'withdrawal_rejected':
    case 'release_rejected':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'earnings_added':
      return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    case 'release_submitted':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    case 'team_member_added':
    case 'team_member_removed':
      return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
}
