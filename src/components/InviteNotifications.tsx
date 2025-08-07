import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, Clock, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface Invitation {
  id: string;
  invited_email: string;
  role: 'account_admin' | 'manager' | 'viewer';
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
  account_owner_id: string;
  owner_name?: string;
  owner_email?: string;
}

interface InviteNotificationsProps {
  userEmail: string;
  onInvitationUpdate?: () => void;
}

const InviteNotifications: React.FC<InviteNotificationsProps> = ({ userEmail, onInvitationUpdate }) => {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, [userEmail]);

  const fetchInvitations = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);
      console.log('Fetching invitations for email:', userEmail);

      // Normalize email for consistent matching
      const normalizedEmail = userEmail.toLowerCase().trim();

      const { data, error } = await supabase
        .from('account_invitations')
        .select(`
          id,
          invited_email,
          role,
          status,
          created_at,
          expires_at,
          token,
          account_owner_id
        `)
        .eq('invited_email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      console.log('Raw invitations data:', data);

      if (!data || data.length === 0) {
        console.log('No pending invitations found');
        setInvitations([]);
        return;
      }

      // Fetch owner details for each invitation
      const invitationsWithOwners = await Promise.all(
        data.map(async (invitation) => {
          try {
            console.log('Fetching owner details for account:', invitation.account_owner_id);
            
            const { data: ownerData, error: ownerError } = await supabase
              .from('artists')
              .select('name, email')
              .eq('id', invitation.account_owner_id)
              .single();

            if (ownerError) {
              console.error('Error fetching owner data:', ownerError);
              return {
                ...invitation,
                owner_name: 'Unknown',
                owner_email: 'unknown@example.com'
              };
            }

            console.log('Owner data:', ownerData);

            return {
              ...invitation,
              owner_name: ownerData?.name || 'Unknown',
              owner_email: ownerData?.email || 'unknown@example.com'
            };
          } catch (error) {
            console.error('Error processing invitation:', error);
            return {
              ...invitation,
              owner_name: 'Unknown',
              owner_email: 'unknown@example.com'
            };
          }
        })
      );

      console.log('Final invitations with owners:', invitationsWithOwners);
      setInvitations(invitationsWithOwners);
    } catch (error) {
      console.error('Error in fetchInvitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    if (!userEmail) return;

    try {
      setProcessing(invitation.id);
      console.log('Accepting invitation:', invitation);

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error('Session error:', sessionError);
        toast({
          title: "Authentication required",
          description: "Please log in to accept this invitation.",
          variant: "destructive"
        });
        return;
      }

      const currentUser = session.user;
      console.log('Current user:', currentUser);

      // Verify email matches (normalize both for comparison)
      const normalizedInviteEmail = invitation.invited_email.toLowerCase().trim();
      const normalizedUserEmail = currentUser.email?.toLowerCase().trim();
      
      if (normalizedInviteEmail !== normalizedUserEmail) {
        toast({
          title: "Email mismatch",
          description: "This invitation was sent to a different email address.",
          variant: "destructive"
        });
        return;
      }

      // Check if invitation is still valid
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          title: "Invitation expired",
          description: "This invitation has expired. Please ask for a new one.",
          variant: "destructive"
        });
        return;
      }

      // Check if user is already a member
      const { data: existingAccess, error: accessError } = await supabase
        .from('account_access')
        .select('*')
        .eq('account_owner_id', invitation.account_owner_id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (accessError) {
        console.error('Error checking existing access:', accessError);
        throw accessError;
      }

      if (existingAccess) {
        console.log('User already has access');
        toast({
          title: "Already a team member",
          description: "You're already a member of this team.",
          variant: "destructive"
        });
        
        // Update invitation status to accepted
        await supabase
          .from('account_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id);
        
        fetchInvitations();
        return;
      }

      // Add user to account_access table
      const { error: insertError } = await supabase
        .from('account_access')
        .insert({
          account_owner_id: invitation.account_owner_id,
          user_id: currentUser.id,
          role: invitation.role,
          granted_by: invitation.account_owner_id
        });

      if (insertError) {
        console.error('Error adding user to account_access:', insertError);
        throw insertError;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('account_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Don't fail the process if this fails
      }

      toast({
        title: "Invitation accepted!",
        description: `You now have ${invitation.role.replace('_', ' ')} access to ${invitation.owner_name}'s account. You can now switch between accounts using the team switcher.`
      });

      // Refresh invitations and notify parent component
      fetchInvitations();
      onInvitationUpdate?.();

      // Force refresh of team accounts in 1 second to ensure data is consistent
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Failed to accept invitation",
        description: "There was an error accepting the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectInvitation = async (invitation: Invitation) => {
    setProcessing(invitation.id);
    
    try {
      const { error } = await supabase
        .from('account_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitation.id);

      if (error) {
        console.error('Error rejecting invitation:', error);
        toast({
          title: "Error",
          description: "Failed to reject invitation. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Invitation rejected",
        description: `You've declined the invitation from ${invitation.owner_name}.`
      });

      // Refresh invitations and notify parent component
      fetchInvitations();
      onInvitationUpdate?.();
      
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
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

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    if (diffDays > 1) return `${diffDays} days`;
    
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffHours === 1) return '1 hour';
    if (diffHours > 1) return `${diffHours} hours`;
    
    return 'Soon';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Team Invitations
          </CardTitle>
          <CardDescription>Loading your pending invitations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Team Invitations
          </CardTitle>
          <CardDescription>No pending team invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any pending team invitations. Team owners can invite you to collaborate on their accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">Team Invitations</CardTitle>
          <CardDescription>
            Pending invitations to join teams
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchInvitations}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading invitations...</span>
          </div>
        ) : invitations.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No pending invitations found. When someone invites you to join their team, invitations will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          Team invitation from {invitation.owner_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invitation.owner_email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Role:</span>
                        {getRoleBadge(invitation.role)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Expires {formatExpiryDate(invitation.expires_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      After accepting, you'll be able to switch between your personal account and this team account.
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={processing === invitation.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing === invitation.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectInvitation(invitation)}
                      disabled={processing === invitation.id}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {processing === invitation.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteNotifications;