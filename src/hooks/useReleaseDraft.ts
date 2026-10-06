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
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeSavesRef = useRef(0);

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
        setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
      }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [userId, enabled]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const persist = useCallback(async (payload: {
    data: ReleaseDraftData;
    cover_art_url: string | null;
    audio_file_urls: string[];
    current_step: number;
    selected_artist_account: string;
  }, force = false): Promise<boolean> => {
    if (!userId) return false;
    const serialized = JSON.stringify(payload);
    const operation = persistQueueRef.current.then(async () => {
      if (!force && serialized === lastPayloadRef.current && draftIdRef.current) return true;

      const row = {
        user_id: userId,
        data: payload.data as any,
        cover_art_url: payload.cover_art_url,
        audio_file_urls: payload.audio_file_urls,
        current_step: payload.current_step,
        selected_artist_account: payload.selected_artist_account,
      };

      activeSavesRef.current += 1;
      setSaving(true);
      try {
        if (draftIdRef.current) {
          const { error } = await supabase.from('release_drafts').update(row).eq('id', draftIdRef.current);
          if (error) return false;
        } else {
          const { data, error } = await supabase.from('release_drafts').insert(row).select('id').single();
          if (error || !data) return false;
          draftIdRef.current = data.id;
        }
        lastPayloadRef.current = serialized;
        setLastSavedAt(new Date());
        return true;
      } catch {
        return false;
      } finally {
        activeSavesRef.current -= 1;
        if (activeSavesRef.current === 0) setSaving(false);
      }
    });
    persistQueueRef.current = operation.then(() => undefined, () => undefined);
    return operation;
  }, [userId]);

  const scheduleSave = useCallback((payload: Parameters<typeof persist>[0]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { persist(payload); }, 1200);
  }, [persist]);

  const saveNow = useCallback(async (payload: Parameters<typeof persist>[0], force = false) => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    const ok = await persist(payload, force);
    return ok ? draftIdRef.current : null;
  }, [persist]);

  const clearDraft = useCallback(async () => {
    const operation = persistQueueRef.current.then(async () => {
      if (!draftIdRef.current) return;
      const { error } = await supabase.from('release_drafts').delete().eq('id', draftIdRef.current);
      if (error) return;
      draftIdRef.current = null;
      setDraft(null);
      lastPayloadRef.current = '';
      setLastSavedAt(null);
    });
    persistQueueRef.current = operation.then(() => undefined, () => undefined);
    await operation;
  }, []);

  return { draft, loaded, scheduleSave, saveNow, clearDraft, saving, lastSavedAt };
};
