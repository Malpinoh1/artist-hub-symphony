import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'mdistro_collective_ref';

const clean = (code: string | null | undefined) => {
  const value = (code ?? '').toLowerCase().trim();
  return /^[a-z0-9-]{2,80}$/.test(value) ? value : null;
};

/** Persist a referral handle so it survives navigation into signup/login. */
export const storePendingReferral = (code: string | null | undefined) => {
  const value = clean(code);
  if (!value) return null;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable */
  }
  return value;
};

export const getPendingReferral = () => {
  try {
    return clean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

export const clearPendingReferral = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Attribute a stored referral to the currently authenticated account.
 * Server-side function handles validation, self-referral and duplicate guards.
 */
export const claimPendingReferral = async () => {
  const code = getPendingReferral();
  if (!code) return { claimed: false };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { claimed: false };

  try {
    const { data, error } = await supabase.functions.invoke('collective-referral-claim', {
      body: { referral_code: code },
    });
    if (error) return { claimed: false };
    // Any resolved outcome (attributed, self-referral, already attributed,
    // invalid code) is final — stop retrying on every page load.
    clearPendingReferral();
    return { claimed: !!(data as any)?.attributed, result: data };
  } catch {
    return { claimed: false };
  }
};

/** Reads a readable error message out of a supabase functions invoke error. */
export const readFunctionError = async (error: any, fallback: string) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error as string;
  } catch {
    /* not a JSON error body */
  }
  return error?.message || fallback;
};
