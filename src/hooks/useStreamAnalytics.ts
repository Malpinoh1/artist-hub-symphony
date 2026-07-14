import { useQuery } from '@tanstack/react-query';
import {
  fetchArtistStreamSummary,
  fetchArtistMonthlyStreams,
  fetchTrackMonthlyStreams,
  fetchReleaseMonthlyStreams,
} from '@/services/royaltyIngestionService';

export const useArtistStreamSummary = (artistId?: string) =>
  useQuery({
    queryKey: ['artist-stream-summary', artistId],
    queryFn: () => fetchArtistStreamSummary(artistId!),
    enabled: !!artistId,
    staleTime: 60_000,
  });

export const useArtistMonthlyStreams = (artistId?: string) =>
  useQuery({
    queryKey: ['artist-monthly-streams', artistId],
    queryFn: () => fetchArtistMonthlyStreams(artistId!),
    enabled: !!artistId,
    staleTime: 60_000,
  });

export const useTrackMonthlyStreams = (trackId?: string) =>
  useQuery({
    queryKey: ['track-monthly-streams', trackId],
    queryFn: () => fetchTrackMonthlyStreams(trackId!),
    enabled: !!trackId,
    staleTime: 60_000,
  });

export const useReleaseMonthlyStreams = (releaseId?: string) =>
  useQuery({
    queryKey: ['release-monthly-streams', releaseId],
    queryFn: () => fetchReleaseMonthlyStreams(releaseId!),
    enabled: !!releaseId,
    staleTime: 60_000,
  });
