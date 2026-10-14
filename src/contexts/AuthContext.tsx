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

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;

    // Subscribe before restoring the session so login/logout events are not missed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      receivedAuthEvent = true;
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
