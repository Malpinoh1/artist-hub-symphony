import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface AccountContextType {
  currentAccountId: string | null;
  currentUser: any | null;
  teamAccounts: TeamAccount[];
  isLoading: boolean;
  switchAccount: (accountId: string) => void;
  refreshTeamAccounts: () => Promise<void>;
  refreshCurrentAccount: () => void;
}

interface TeamAccount {
  account_owner_id: string;
  role: string;
  owner_name: string;
  owner_email: string;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAccount();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Only synchronous state updates inside callback
        setCurrentUser(session.user);
        const storedAccountId = localStorage.getItem('currentAccountId');
        const accountId = storedAccountId || session.user.id;
        setCurrentAccountId(accountId);
        
        // Defer async Supabase calls to prevent auth loop
        setTimeout(() => {
          fetchTeamAccounts(session.user.id);
        }, 0);
      } else {
        setCurrentUser(null);
        setCurrentAccountId(null);
        setTeamAccounts([]);
        localStorage.removeItem('currentAccountId');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        
        // Check for stored account preference
        const storedAccountId = localStorage.getItem('currentAccountId');
        const accountId = storedAccountId || session.user.id;
        setCurrentAccountId(accountId);
        
        await fetchTeamAccounts(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamAccounts = async (userId: string) => {
    try {
      // Get all accounts user has access to
      const { data, error } = await supabase
        .from('account_access')
        .select(`
          account_owner_id,
          role
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching team accounts:', error);
        return;
      }

      // Get account owner details separately
      const accounts: TeamAccount[] = [];
      
      if (data) {
        for (const access of data) {
          const { data: artistData, error: artistError } = await supabase
            .from('artists')
            .select('name, email')
            .eq('id', access.account_owner_id)
            .maybeSingle();

          if (artistError) {
            console.error('Error fetching artist data:', artistError);
          }

          accounts.push({
            account_owner_id: access.account_owner_id,
            role: access.role,
            owner_name: artistData?.name || 'Unknown',
            owner_email: artistData?.email || 'unknown@example.com'
          });
        }
      }

      setTeamAccounts(accounts);
    } catch (error) {
      console.error('Error fetching team accounts:', error);
    }
  };

  const switchAccount = (accountId: string) => {
    setCurrentAccountId(accountId);
    localStorage.setItem('currentAccountId', accountId);
    
    const isPersonalAccount = accountId === currentUser?.id;
    const accountName = isPersonalAccount 
      ? 'your personal account' 
      : teamAccounts.find(acc => acc.account_owner_id === accountId)?.owner_name || 'team account';
    
    toast({
      title: "Account switched",
      description: `Now viewing ${accountName}`
    });

    // Refresh page to update all data contexts
    window.location.reload();
  };

  const refreshTeamAccounts = async () => {
    if (currentUser) {
      await fetchTeamAccounts(currentUser.id);
    }
  };

  const refreshCurrentAccount = () => {
    // Force refresh of current account data
    window.location.reload();
  };

  const value: AccountContextType = {
    currentAccountId,
    currentUser,
    teamAccounts,
    isLoading,
    switchAccount,
    refreshTeamAccounts,
    refreshCurrentAccount
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};