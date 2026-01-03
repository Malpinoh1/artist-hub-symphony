import React, { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '../integrations/supabase/client';

export const AdminTwoFactorReset: React.FC = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchUser = async () => {
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user email",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, two_factor_enabled')
        .ilike('username', `%${userEmail.trim()}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(profiles || []);
      
      if (!profiles || profiles.length === 0) {
        toast({
          title: "No users found",
          description: "No users found with that email address",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Failed to search for users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetUserTwoFactor = async (targetUserId: string, targetUserEmail: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          two_factor_recovery_code: null,
          two_factor_recovery_expires: null
        })
        .eq('id', targetUserId);

      if (error) throw error;

      toast({
        title: "2FA Reset Successfully",
        description: `Two-factor authentication has been disabled for ${targetUserEmail}`
      });

      // Clear search results
      setSearchResults([]);
      setUserEmail('');
    } catch (error) {
      console.error('Error resetting 2FA:', error);
      toast({
        title: "Reset failed",
        description: "Failed to reset 2FA for the user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle>Admin: Reset User 2FA</CardTitle>
            <CardDescription>
              Reset two-factor authentication for users who have lost access
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Admin Only:</strong> This action will completely disable 2FA for the selected user. 
            They will need to set it up again if they want to re-enable it.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="user-email">User Email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="user-email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button onClick={searchUser} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      2FA: {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  {user.two_factor_enabled && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => resetUserTwoFactor(user.id, user.username)}
                      disabled={loading}
                    >
                      Reset 2FA
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Instructions for users who lose 2FA access:</strong>
            <br />1. User contacts support
            <br />2. Admin verifies user identity 
            <br />3. Admin uses this tool to reset 2FA
            <br />4. User can then sign in normally and re-enable 2FA if desired
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};