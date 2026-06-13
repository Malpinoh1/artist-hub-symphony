import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReleaseDraftData {
  formData: any;
  tracks: any[];
  storeSelections: Record<string, any>;
  freeTrackIds: string[];
  audioClips: Record<string, any>;
  termsAccepted: boolean;
}

export interface ReleaseDraft {
  id: string;
  data: ReleaseDraftData;
  cover_art_url: string | null;
  audio_file_urls: string[];
  current_step: number;
  selected_artist_account: string;
  updated_at: string;
}

interface UseReleaseDraftArgs {
  userId: string | null;
  enabled: boolean;
}

/**
 * Cross-device release draft auto-save.
 * - Loads the latest draft for the user on mount.
 * - Debounced upsert on any change.
 * - Exposes `saveNow` for synchronous persistence (e.g. before redirecting to checkout).
 */
export const useReleaseDraft = ({ userId, enabled }: UseReleaseDraftArgs) => {
  const [draft, setDraft] = useState<ReleaseDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const draftIdRef = useRef<string | null>(null);
  const lastPayloadRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing
  useEffect(() => {
    if (!userId || !enabled) { setLoaded(true); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('release_drafts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (data) {
        draftIdRef.current = data.id;
        setDraft({
          id: data.id,
          data: (data.data as any) ?? { formData: {}, tracks: [], storeSelections: {}, freeTrackIds: [], audioClips: {}, termsAccepted: false },
          cover_art_url: data.cover_art_url,
          audio_file_urls: data.audio_file_urls ?? [],
          current_step: data.current_step ?? 1,
          selected_artist_account: data.selected_artist_account ?? 'self',
          updated_at: data.updated_at,
        });
      }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId, enabled]);

  const persist = useCallback(async (payload: {
    data: ReleaseDraftData;
    cover_art_url: string | null;
    audio_file_urls: string[];
    current_step: number;
    selected_artist_account: string;
  }) => {
    if (!userId) return;
    const serialized = JSON.stringify(payload);
    if (serialized === lastPayloadRef.current) return;
    lastPayloadRef.current = serialized;

    const row = {
      user_id: userId,
      data: payload.data as any,
      cover_art_url: payload.cover_art_url,
      audio_file_urls: payload.audio_file_urls,
      current_step: payload.current_step,
      selected_artist_account: payload.selected_artist_account,
    };

    if (draftIdRef.current) {
      await supabase.from('release_drafts').update(row).eq('id', draftIdRef.current);
    } else {
      const { data, error } = await supabase.from('release_drafts').insert(row).select('id').single();
      if (!error && data) draftIdRef.current = data.id;
    }
  }, [userId]);

  const scheduleSave = useCallback((payload: Parameters<typeof persist>[0]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(payload), 1200);
  }, [persist]);

  const saveNow = useCallback(async (payload: Parameters<typeof persist>[0]) => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    await persist(payload);
    return draftIdRef.current;
  }, [persist]);

  const clearDraft = useCallback(async () => {
    if (!draftIdRef.current) return;
    await supabase.from('release_drafts').delete().eq('id', draftIdRef.current);
    draftIdRef.current = null;
    setDraft(null);
    lastPayloadRef.current = '';
  }, []);

  return { draft, loaded, scheduleSave, saveNow, clearDraft };
};
