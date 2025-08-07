import React, { useState, useEffect } from 'react';
import { ChevronDown, Users, Building, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface TeamAccount {
  account_owner_id: string;
  role: string;
  owner_name: string;
  owner_email: string;
}

interface TeamSwitcherProps {
  currentUserId: string;
  onAccountSwitch?: (accountId: string) => void;
}

const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ currentUserId, onAccountSwitch }) => {
  const { toast } = useToast();
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>(currentUserId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamAccounts();
    
    // Check for stored account preference
    const storedAccountId = localStorage.getItem('currentAccountId');
    if (storedAccountId && storedAccountId !== currentUserId) {
      setCurrentAccount(storedAccountId);
    }
  }, [currentUserId]);

  const fetchTeamAccounts = async () => {
    try {
      // Get all accounts user has access to
      const { data, error } = await supabase
        .from('account_access')
        .select(`
          account_owner_id,
          role
        `)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error fetching team accounts:', error);
        return;
      }

      // Get account owner details separately
      const accounts: TeamAccount[] = [];
      
      if (data) {
        for (const access of data) {
          try {
            const { data: artistData, error: artistError } = await supabase
              .from('artists')
              .select('name, email')
              .eq('id', access.account_owner_id)
              .single();

            if (artistError) {
              console.warn('Could not fetch artist data for:', access.account_owner_id);
            }

            accounts.push({
              account_owner_id: access.account_owner_id,
              role: access.role,
              owner_name: artistData?.name || `User ${access.account_owner_id.slice(0, 8)}`,
              owner_email: artistData?.email || 'unknown@example.com'
            });
          } catch (error) {
            console.error('Error processing team account:', error);
          }
        }
      }

      setTeamAccounts(accounts);
    } catch (error) {
      console.error('Error fetching team accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSwitch = (accountId: string) => {
    setCurrentAccount(accountId);
    onAccountSwitch?.(accountId);
    
    // Store current account in localStorage for persistence
    localStorage.setItem('currentAccountId', accountId);
    
    const isPersonalAccount = accountId === currentUserId;
    const accountName = isPersonalAccount 
      ? 'your personal account' 
      : teamAccounts.find(acc => acc.account_owner_id === accountId)?.owner_name || 'team account';
    
    toast({
      title: "Account switched",
      description: `Now viewing ${accountName}`
    });

    // Reload the page to refresh all data with new account context
    window.location.reload();
  };

  const getCurrentAccountName = () => {
    if (currentAccount === currentUserId) {
      return 'My Account';
    }
    
    const account = teamAccounts.find(acc => acc.account_owner_id === currentAccount);
    return account ? account.owner_name : 'Unknown Account';
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      account_admin: { label: 'Admin', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      manager: { label: 'Manager', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      viewer: { label: 'Viewer', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
    return <Badge className={`text-xs ${config.className}`}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Users className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // Always show switcher if user has team accounts or if they're viewing a different account
  const shouldShowSwitcher = teamAccounts.length > 0 || currentAccount !== currentUserId;
  
  if (!shouldShowSwitcher) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 max-w-[200px]">
          <Building className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline truncate">{getCurrentAccountName()}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium text-muted-foreground">Switch Account</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTeamAccounts}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Current user's own account */}
        <DropdownMenuItem 
          onClick={() => handleAccountSwitch(currentUserId)}
          className={currentAccount === currentUserId ? 'bg-muted' : ''}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium truncate">My Account</span>
              <span className="text-xs text-muted-foreground">Account Owner</span>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs ml-2 flex-shrink-0">
              Owner
            </Badge>
          </div>
        </DropdownMenuItem>
        
        {/* Team accounts */}
        {teamAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {teamAccounts.map((account) => (
              <DropdownMenuItem 
                key={account.account_owner_id}
                onClick={() => handleAccountSwitch(account.account_owner_id)}
                className={currentAccount === account.account_owner_id ? 'bg-muted' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{account.owner_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{account.owner_email}</span>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {getRoleBadge(account.role)}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {teamAccounts.length === 0 && (
          <div className="p-2">
            <span className="text-xs text-muted-foreground">No team accounts found. Accept team invitations in Settings to see them here.</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TeamSwitcher;