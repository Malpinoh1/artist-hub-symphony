import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_RATE = 1250;
const STALE_MS = 24 * 60 * 60 * 1000; // 24h

let cachedRate: number | null = null;
let cachedFetchedAt: string | null = null;
let inflight: Promise<void> | null = null;

async function loadRate() {
  // Get latest from DB
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, fetched_at')
    .eq('base', 'USD')
    .eq('quote', 'NGN')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isStale = !data || (Date.now() - new Date(data.fetched_at).getTime() > STALE_MS);

  if (isStale) {
    try {
      const { data: fnData } = await supabase.functions.invoke('fetch-exchange-rate');
      if (fnData?.rate) {
        cachedRate = Number(fnData.rate);
        cachedFetchedAt = fnData.fetched_at || new Date().toISOString();
        return;
      }
    } catch (e) {
      console.warn('fetch-exchange-rate failed, using cached/fallback', e);
    }
  }

  if (data?.rate) {
    cachedRate = Number(data.rate);
    cachedFetchedAt = data.fetched_at;
  } else {
    cachedRate = FALLBACK_RATE;
    cachedFetchedAt = null;
  }
}

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(cachedRate ?? FALLBACK_RATE);
  const [fetchedAt, setFetchedAt] = useState<string | null>(cachedFetchedAt);
  const [isLoading, setIsLoading] = useState<boolean>(cachedRate === null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    if (!inflight) inflight = loadRate().finally(() => { inflight = null; });
    await inflight;
    setRate(cachedRate ?? FALLBACK_RATE);
    setFetchedAt(cachedFetchedAt);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (cachedRate !== null) {
      setRate(cachedRate);
      setFetchedAt(cachedFetchedAt);
      setIsLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  return { rate, fetchedAt, isLoading, refresh };
}
