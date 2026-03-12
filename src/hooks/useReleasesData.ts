import { useQuery } from '@tanstack/react-query';
import { fetchUserReleases, Release } from '@/services/releaseService';

export const useReleasesData = (accountId: string | undefined) => {
  return useQuery<Release[]>({
    queryKey: ['releases', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      return fetchUserReleases(accountId);
    },
    enabled: !!accountId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
