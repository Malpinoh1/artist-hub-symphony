import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EarningsSummary {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  creditBalance: number;
  recentEarnings: any[];
  withdrawals: any[];
}

const defaultSummary: EarningsSummary = {
  totalEarnings: 0,
  availableBalance: 0,
  pendingEarnings: 0,
  creditBalance: 0,
  recentEarnings: [],
  withdrawals: [],
};

export const useEarningsData = (artistId: string | undefined) => {
  return useQuery({
    queryKey: ['earningsData', artistId],
    queryFn: async (): Promise<EarningsSummary> => {
      if (!artistId) return defaultSummary;

      const [earningsRes, withdrawalsRes, artistRes] = await Promise.all([
        supabase
          .from('earnings')
          .select('*')
          .eq('artist_id', artistId)
          .order('date', { ascending: false }),
        supabase
          .from('withdrawals')
          .select('*')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false }),
        supabase
          .from('artists')
          .select('total_earnings, available_balance, credit_balance')
          .eq('id', artistId)
          .maybeSingle(),
      ]);

      const earningsData = earningsRes.data || [];
      const withdrawalsData = withdrawalsRes.data || [];
      const artist = artistRes.data;

      const pendingEarnings = earningsData
        .filter((e) => e.status === 'Pending')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        totalEarnings: artist?.total_earnings || 0,
        availableBalance: artist?.available_balance || 0,
        pendingEarnings,
        creditBalance: artist?.credit_balance || 0,
        recentEarnings: earningsData,
        withdrawals: withdrawalsData,
      };
    },
    enabled: !!artistId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
