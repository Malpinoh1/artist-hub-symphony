import React, { useState, useEffect } from 'react';
import { Users, Building, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface TeamAccount {
  account_owner_id: string;
  role: string;
  owner_name: string;
  owner_email: string;
}

interface FloatingTeamSwitcherProps {
  currentUserId: string;
  onAccountSwitch?: (accountId: string) => void;
}

const FloatingTeamSwitcher: React.FC<FloatingTeamSwitcherProps> = ({ currentUserId, onAccountSwitch }) => {
  const { toast } = useToast();
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>(currentUserId);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          const { data: artistData } = await supabase
            .from('artists')
            .select('name, email')
            .eq('id', access.account_owner_id)
            .single();

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
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSwitch = (accountId: string) => {
    setCurrentAccount(accountId);
    onAccountSwitch?.(accountId);
    
    // Store current account in localStorage for persistence
    localStorage.setItem('currentAccountId', accountId);
    
    toast({
      title: "Account switched",
      description: `Now viewing ${accountId === currentUserId ? 'your account' : 'team account'}`
    });

    setIsDialogOpen(false);
    
    // Reload the page to refresh all data with new account context
    window.location.reload();
  };

  const getCurrentAccountName = () => {
    if (currentAccount === currentUserId) {
      return 'Personal';
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

  const isCurrentlyViewingTeam = currentAccount !== currentUserId;

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsDialogOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 ${
          isCurrentlyViewingTeam
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
            : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'
        }`}
        size="lg"
      >
        <div className="relative">
          <img 
            src="/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png" 
            alt="MALPINOHdistro Logo" 
            className="w-6 h-6 object-contain"
          />
          <div className="absolute -bottom-1 -right-1">
            {isCurrentlyViewingTeam ? (
              <Users className="w-4 h-4 text-white" />
            ) : (
              <Building className="w-4 h-4 text-white" />
            )}
          </div>
        </div>
      </Button>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Dashboard Switcher
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Currently viewing</p>
              <p className="font-semibold text-lg">{getCurrentAccountName()}</p>
              {isCurrentlyViewingTeam && (
                <Badge variant="secondary" className="mt-1">Team Account</Badge>
              )}
            </div>

            {/* Account Options */}
            <div className="space-y-2">
              {/* Personal Account */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  currentAccount === currentUserId ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleAccountSwitch(currentUserId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center">
                        <Building className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Personal Dashboard</p>
                        <p className="text-sm text-muted-foreground">Your own account</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Owner
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Team Accounts */}
              {teamAccounts.length > 0 ? (
                teamAccounts.map((account) => (
                  <Card 
                    key={account.account_owner_id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      currentAccount === account.account_owner_id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleAccountSwitch(account.account_owner_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{account.owner_name}</p>
                            <p className="text-sm text-muted-foreground">{account.owner_email}</p>
                          </div>
                        </div>
                        {getRoleBadge(account.role)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You're not a member of any teams yet. Ask a team owner to send you an invitation to join their team.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingTeamSwitcher;