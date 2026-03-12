import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';

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
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (authUser) {
      setCurrentUser(authUser);
      const storedAccountId = localStorage.getItem('currentAccountId');
      const accountId = storedAccountId || authUser.id;
      setCurrentAccountId(accountId);
      // Defer to break synchronous chain per auth-rate-limiting-prevention
      setTimeout(() => fetchTeamAccounts(authUser.id), 0);
    } else {
      setCurrentUser(null);
      setCurrentAccountId(null);
      setTeamAccounts([]);
      localStorage.removeItem('currentAccountId');
      setIsLoading(false);
    }
  }, [authUser, authLoading]);

  const fetchTeamAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('account_access')
        .select('account_owner_id, role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching team accounts:', error);
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setTeamAccounts([]);
        setIsLoading(false);
        return;
      }

      // Batch fetch all artist data in a single query instead of N+1
      const ownerIds = data.map(a => a.account_owner_id);
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, email')
        .in('id', ownerIds);

      if (artistsError) {
        console.error('Error fetching artists batch:', artistsError);
      }

      // Build a lookup map
      const artistMap = new Map<string, { name: string; email: string }>();
      if (artistsData) {
        for (const a of artistsData) {
          artistMap.set(a.id, { name: a.name, email: a.email });
        }
      }

      const accounts: TeamAccount[] = data.map(access => {
        const artist = artistMap.get(access.account_owner_id);
        return {
          account_owner_id: access.account_owner_id,
          role: access.role,
          owner_name: artist?.name || 'Unknown',
          owner_email: artist?.email || 'unknown@example.com',
        };
      });

      setTeamAccounts(accounts);
    } catch (error) {
      console.error('Error fetching team accounts:', error);
    } finally {
      setIsLoading(false);
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

    window.location.reload();
  };

  const refreshTeamAccounts = async () => {
    if (currentUser) {
      await fetchTeamAccounts(currentUser.id);
    }
  };

  const refreshCurrentAccount = () => {
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
