import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInEvent, setSignInEvent] = useState(0);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    // Subscribe before restoring the session so login/logout events are not missed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      receivedAuthEvent = true;
      // Observe every successful sign-in centrally so alternate login forms and
      // OAuth redirects cannot bypass the security alert. A delayed session check
      // below filters out password sessions immediately discarded for 2FA.
      if (event === 'SIGNED_IN' && newSession?.user) {
        setSignInEvent((current) => current + 1);
      }
      if (!active) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    // A slow initial session lookup must not overwrite a newer auth event.
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) console.warn('Could not restore authentication session:', error.message);
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
    }).catch((error) => {
      if (!active || receivedAuthEvent) return;
      console.error('Could not restore authentication session:', error);
      setSession(null);
      setUser(null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Send one security alert for any real sign-in, after checking that the session
  // still exists. This avoids alerting for the first password step of a 2FA login.
  useEffect(() => {
    if (!signInEvent || !user?.id) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled || !currentSession?.user?.id || currentSession.user.id !== user.id) return;
        const standalone = window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true;
        const { error } = await supabase.functions.invoke('login-security-alert', {
          body: { platform: standalone ? 'app' : 'web' },
        });
        if (error) console.warn('Login security alert was not sent:', error.message);
      } catch (error) {
        console.warn('Login security alert was not sent:', error);
      }
    }, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signInEvent, user?.id]);

  // Check renewal eligibility whenever an artist signs in or an existing session is restored.
  // The server deduplicates notifications per subscription expiry and retries failed emails.
  useEffect(() => {
    if (!user?.id) return;
    void supabase.functions.invoke('notify-subscription-renewal', { body: {} })
      .then(({ error }) => {
        if (error) console.warn('Renewal notification check did not complete:', error.message);
      })
      .catch((error) => console.warn('Renewal notification check did not complete:', error));
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
