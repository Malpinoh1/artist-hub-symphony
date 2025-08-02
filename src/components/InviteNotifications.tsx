import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, Clock, AlertCircle } from 'lucide-react';
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
    try {
      const { data: inviteData, error } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('invited_email', userEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      // Get owner details for each invitation
      const invitationsWithOwnerDetails: Invitation[] = [];
      
      for (const invite of inviteData || []) {
        const { data: artistData } = await supabase
          .from('artists')
          .select('name, email')
          .eq('id', invite.account_owner_id)
          .single();

        invitationsWithOwnerDetails.push({
          ...invite,
          owner_name: artistData?.name || 'Unknown',
          owner_email: artistData?.email || 'unknown@example.com'
        });
      }

      setInvitations(invitationsWithOwnerDetails);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    setProcessing(invitation.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Authentication required",
          description: "Please log in to accept the invitation.",
          variant: "destructive"
        });
        return;
      }

      // Check if invitation is still valid
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          title: "Invitation expired",
          description: "This invitation has expired. Please ask for a new invitation.",
          variant: "destructive"
        });
        return;
      }

      // Add user to account access
      const { error: accessError } = await supabase
        .from('account_access')
        .insert({
          account_owner_id: invitation.account_owner_id,
          user_id: session.user.id,
          role: invitation.role,
          granted_by: invitation.account_owner_id
        });

      if (accessError) {
        console.error('Error adding account access:', accessError);
        toast({
          title: "Error accepting invitation",
          description: "Failed to join the team. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('account_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }

      toast({
        title: "Invitation accepted!",
        description: `You've successfully joined ${invitation.owner_name}'s team as a ${invitation.role}.`
      });

      // Refresh invitations and notify parent component
      fetchInvitations();
      onInvitationUpdate?.();
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Team Invitations
          <Badge variant="destructive" className="ml-2">
            {invitations.length}
          </Badge>
        </CardTitle>
        <CardDescription>You have pending team invitations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium">{invitation.owner_name}</span>
                      {getRoleBadge(invitation.role)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {invitation.owner_email} invited you to join their team
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Expires in {formatExpiryDate(invitation.expires_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectInvitation(invitation)}
                      disabled={processing === invitation.id}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={processing === invitation.id}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InviteNotifications;