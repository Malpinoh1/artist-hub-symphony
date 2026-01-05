import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Mail, Shield, MoreHorizontal, Trash2, Edit3, AlertCircle, Copy, ExternalLink, CheckCircle, Link2, Lock, Building2, Loader2, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import SubscriptionGate from '../components/SubscriptionGate';
import { sendTeamInviteEmail, sendTeamNotificationEmail } from '../utils/email';


interface TeamMember {
  id: string;
  user_id: string;
  role: 'account_admin' | 'manager' | 'viewer';
  created_at: string;
  account_owner_id: string;
  granted_by: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface Invitation {
  id: string;
  invited_email: string;
  role: 'account_admin' | 'manager' | 'viewer';
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
  account_owner_id: string;
}

const Team = () => {
  const { toast } = useToast();
  const { 
    canManageTeam, 
    isOwner, 
    isAdmin, 
    role, 
    isPersonalAccount,
    getEffectiveAccountId,
    isWebsiteAdmin 
  } = useTeamPermissions();
  const [user, setUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'account_admin' | 'manager' | 'viewer'>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [manualInviteLink, setManualInviteLink] = useState<string | null>(null);
  const [directInviteToken, setDirectInviteToken] = useState('');
  const [processingDirectInvite, setProcessingDirectInvite] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (!session) {
        window.location.href = '/auth';
        return;
      }
      
      setUser(session.user);
      await Promise.all([
        fetchTeamMembers(session.user.id),
        fetchInvitations(session.user.id),
        fetchMyInvitations(session.user.email),
        fetchTeamName(session.user.id)
      ]);
    } catch (error) {
      console.error('Error checking auth:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to verify authentication. Please try logging in again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (accountOwnerId: string) => {
    try {
      console.log('Fetching team members for account owner:', accountOwnerId);
      
      const { data: accessData, error: accessError } = await supabase
        .from('account_access')
        .select('*')
        .eq('account_owner_id', accountOwnerId);

      if (accessError) {
        console.error('Error fetching access data:', accessError);
        // Don't throw here - just show empty state
        setTeamMembers([]);
        return;
      }

      console.log('Access data:', accessData);

      if (!accessData || accessData.length === 0) {
        console.log('No team members found');
        setTeamMembers([]);
        return;
      }

      // Get user details from auth.users metadata or use fallbacks
      const membersWithDetails: TeamMember[] = await Promise.all(
        accessData.map(async (access) => {
          let userEmail = `user-${access.user_id.slice(0, 8)}`;
          let userName = `User ${access.user_id.slice(0, 8)}`;

          // Try to get profile information
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', access.user_id)
              .single();

            if (profileData) {
              userEmail = profileData.username || userEmail;
              userName = profileData.full_name || userName;
            }
          } catch (profileError) {
            console.warn('Could not fetch profile for user:', access.user_id);
          }

          return {
            ...access,
            user_email: userEmail,
            user_name: userName
          };
        })
      );

      console.log('Final team members:', membersWithDetails);
      setTeamMembers(membersWithDetails);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchInvitations = async (accountOwnerId: string) => {
    try {
      console.log('Fetching invitations for account owner:', accountOwnerId);
      
      const { data, error } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('account_owner_id', accountOwnerId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching invitations:', error);
        setInvitations([]);
        return;
      }
      
      console.log('Invitations data:', data);
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    }
  };

  const fetchMyInvitations = async (userEmail: string) => {
    try {
      console.log('Fetching invitations for user email:', userEmail);
      
      // Normalize email for consistent matching
      const normalizedEmail = userEmail.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('invited_email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching my invitations:', error);
        setMyInvitations([]);
        return;
      }
      
      console.log('My invitations data:', data);
      setMyInvitations(data || []);
    } catch (error) {
      console.error('Error fetching my invitations:', error);
      setMyInvitations([]);
    }
  };

  const fetchTeamName = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('team_name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching team name:', error);
        return;
      }

      if (data?.team_name) {
        setTeamName(data.team_name);
        setNewTeamName(data.team_name);
      }
    } catch (error) {
      console.error('Error fetching team name:', error);
    }
  };

  const handleSaveTeamName = async () => {
    if (!user || !newTeamName.trim()) return;

    setSavingTeamName(true);
    try {
      const { error } = await supabase
        .from('artists')
        .update({ team_name: newTeamName.trim() })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving team name:', error);
        throw error;
      }

      setTeamName(newTeamName.trim());
      setIsEditingTeamName(false);
      toast({
        title: "Team name updated",
        description: "Your team name has been saved successfully."
      });
    } catch (error) {
      console.error('Error saving team name:', error);
      toast({
        title: "Failed to save team name",
        description: "There was an error saving your team name. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    if (!user) return;

    try {
      console.log('Accepting invitation:', invitation.id);
      
      // Check if user is already a member
      const { data: existingAccess } = await supabase
        .from('account_access')
        .select('*')
        .eq('account_owner_id', invitation.account_owner_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingAccess) {
        console.log('User already has access');
        toast({
          title: "Already a team member",
          description: "You're already a member of this team.",
          variant: "destructive"
        });
        return;
      }

      // Add user to account_access table
      const { error: accessError } = await supabase
        .from('account_access')
        .insert({
          account_owner_id: invitation.account_owner_id,
          user_id: user.id,
          role: invitation.role,
          granted_by: invitation.account_owner_id
        });

      if (accessError) {
        console.error('Error adding user to account_access:', accessError);
        throw accessError;
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
        title: "Invitation accepted successfully!",
        description: `You now have ${invitation.role.replace('_', ' ')} access to the team account.`
      });

      // Refresh the data
      await fetchMyInvitations(user.email);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Failed to accept invitation",
        description: "There was an error accepting the invitation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInviteUser = async () => {
    if (!user || !inviteEmail.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      
      console.log('Sending invitation:', {
        account_owner_id: user.id,
        invited_email: normalizedEmail,
        role: inviteRole
      });

      // Check for existing invitation first
      const { data: existingInvite } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('account_owner_id', user.id)
        .eq('invited_email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        toast({
          title: "Invitation already sent",
          description: "This email has already been invited to your account.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('account_invitations')
        .insert({
          account_owner_id: user.id,
          invited_email: normalizedEmail,
          role: inviteRole
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        if (error.code === '23505') {
          toast({
            title: "User already invited",
            description: "This email has already been invited to your account.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      console.log('Invitation created:', data);

      // Create invitation URL for sharing
      const inviteUrl = `${window.location.origin}/team/accept-invitation?token=${data.token}`;
      setManualInviteLink(inviteUrl);

      // Get user's profile name for the email
      let inviterName = 'A team owner';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          inviterName = profile.full_name;
        }
      } catch (e) {
        console.warn('Could not fetch inviter name:', e);
      }

      // Send invitation email
      setSendingEmail(true);
      try {
        const emailResult = await sendTeamInviteEmail({
          to: normalizedEmail,
          inviterName,
          teamName: teamName || 'MALPINOHdistro Team',
          role: inviteRole,
          inviteLink: inviteUrl,
          expiresAt: data.expires_at
        });

        if (emailResult.success) {
          toast({
            title: "Invitation sent!",
            description: `An email invitation has been sent to ${inviteEmail}.`
          });
        } else {
          console.error('Email send failed:', emailResult.error);
          toast({
            title: "Invitation created",
            description: `Invitation created but email could not be sent. Share the link manually with ${inviteEmail}.`,
            variant: "default"
          });
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast({
          title: "Invitation created",
          description: `Invitation created. Share the link with ${inviteEmail} to complete the process.`
        });
      } finally {
        setSendingEmail(false);
      }

      setInviteEmail('');
      setInviteRole('viewer');
      await fetchInvitations(user.id);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Failed to send invitation",
        description: "There was an error sending the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard."
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const handleResendInviteEmail = async (invitation: Invitation) => {
    if (!user) return;

    setSendingEmail(true);
    try {
      const inviteUrl = `${window.location.origin}/team/accept-invitation?token=${invitation.token}`;
      
      // Get user's profile name for the email
      let inviterName = 'A team owner';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          inviterName = profile.full_name;
        }
      } catch (e) {
        console.warn('Could not fetch inviter name:', e);
      }

      const emailResult = await sendTeamInviteEmail({
        to: invitation.invited_email,
        inviterName,
        teamName: teamName || 'MALPINOHdistro Team',
        role: invitation.role,
        inviteLink: inviteUrl,
        expiresAt: invitation.expires_at
      });

      if (emailResult.success) {
        toast({
          title: "Email resent!",
          description: `Invitation email has been resent to ${invitation.invited_email}.`
        });
      } else {
        console.error('Email resend failed:', emailResult.error);
        toast({
          title: "Email failed",
          description: "Could not resend the invitation email. Try copying the link instead.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: "Email failed",
        description: "Could not resend the invitation email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string, memberEmail?: string) => {
    if (!user) return;
    
    try {
      console.log('Removing team member:', memberId);
      
      const { error } = await supabase
        .from('account_access')
        .delete()
        .eq('id', memberId)
        .eq('account_owner_id', user.id);

      if (error) {
        console.error('Error removing team member:', error);
        throw error;
      }

      toast({
        title: "Team member removed",
        description: "The team member has been removed from your account."
      });

      // Send notification email to removed member
      if (memberEmail) {
        try {
          await sendTeamNotificationEmail({
            to: memberEmail,
            type: 'removed',
            teamName: teamName || 'MALPINOHdistro Team',
          });
          console.log('Removal notification sent to:', memberEmail);
        } catch (emailError) {
          console.error('Failed to send removal notification:', emailError);
        }
      }

      await fetchTeamMembers(user.id);
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Failed to remove member",
        description: "There was an error removing the team member. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: string, memberEmail: string, currentRole: string, newRole: 'account_admin' | 'manager' | 'viewer') => {
    if (!user || currentRole === newRole) return;
    
    try {
      console.log('Updating member role:', { memberId, currentRole, newRole });
      
      const { error } = await supabase
        .from('account_access')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('account_owner_id', user.id);

      if (error) {
        console.error('Error updating member role:', error);
        throw error;
      }

      toast({
        title: "Role updated",
        description: `Member role has been changed to ${newRole.replace('_', ' ')}.`
      });

      // Send notification email about role change
      try {
        await sendTeamNotificationEmail({
          to: memberEmail,
          type: 'role_updated',
          teamName: teamName || 'MALPINOHdistro Team',
          oldRole: currentRole,
          newRole: newRole,
        });
        console.log('Role update notification sent to:', memberEmail);
      } catch (emailError) {
        console.error('Failed to send role update notification:', emailError);
      }

      await fetchTeamMembers(user.id);
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Failed to update role",
        description: "There was an error updating the member's role. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      console.log('Cancelling invitation:', invitationId);
      
      const { error } = await supabase
        .from('account_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('account_owner_id', user.id);

      if (error) {
        console.error('Error cancelling invitation:', error);
        throw error;
      }

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled."
      });

      await fetchInvitations(user.id);
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Failed to cancel invitation",
        description: "There was an error cancelling the invitation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDirectInviteAcceptance = async () => {
    if (!directInviteToken.trim()) {
      toast({
        title: "Invalid token",
        description: "Please enter a valid invitation token.",
        variant: "destructive"
      });
      return;
    }

    setProcessingDirectInvite(true);
    try {
      // Find the invitation by token
      const { data: invitation, error: fetchError } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('token', directInviteToken.trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching invitation:', fetchError);
        throw fetchError;
      }

      if (!invitation) {
        toast({
          title: "Invalid invitation",
          description: "This invitation token is invalid, expired, or has already been used.",
          variant: "destructive"
        });
        return;
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          title: "Invitation expired",
          description: "This invitation has expired. Please ask for a new one.",
          variant: "destructive"
        });
        return;
      }

      await handleAcceptInvitation(invitation);
      setDirectInviteToken('');
    } catch (error) {
      console.error('Error processing direct invitation:', error);
      toast({
        title: "Error processing invitation",
        description: "There was an error processing the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingDirectInvite(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      account_admin: { label: 'Admin', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      manager: { label: 'Manager', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      viewer: { label: 'Viewer', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading team management...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Team Access Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage who has access to your music distribution account and control their permissions
            </p>
          </div>

          {/* Team Name Section */}
          {isPersonalAccount && canManageTeam && (
            <div className="mb-8">
              <AnimatedCard>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Team Name
                    </CardTitle>
                    <CardDescription>
                      Set a name for your team. This will be shown in invitation emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditingTeamName ? (
                      <div className="flex gap-3">
                        <Input
                          placeholder="Enter your team name..."
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSaveTeamName}
                          disabled={savingTeamName || !newTeamName.trim()}
                        >
                          {savingTeamName ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : 'Save'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsEditingTeamName(false);
                            setNewTeamName(teamName);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          {teamName ? (
                            <span className="text-lg font-medium">{teamName}</span>
                          ) : (
                            <span className="text-muted-foreground italic">No team name set</span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditingTeamName(true)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          {teamName ? 'Edit' : 'Set Name'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          )}

          {/* Direct Invitation Acceptance */}
          <div className="mb-8">
            <AnimatedCard>
              <Card className="border-blue-200/50 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-600" />
                    Accept Team Invitation
                  </CardTitle>
                  <CardDescription>
                    Have an invitation token? Enter it here to quickly join a team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Paste invitation token here..."
                      value={directInviteToken}
                      onChange={(e) => setDirectInviteToken(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleDirectInviteAcceptance}
                      disabled={!directInviteToken.trim() || processingDirectInvite}
                    >
                      {processingDirectInvite ? 'Processing...' : 'Accept Invitation'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Or check your email for invitation links sent to you
                  </p>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>

          {/* My Invitations */}
          {myInvitations.length > 0 && (
            <div className="mb-8">
              <AnimatedCard>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Invitations for You
                    </CardTitle>
                    <CardDescription>
                      You have been invited to join these teams ({myInvitations.length} pending)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 rounded-lg border bg-background">
                          <div className="flex-1">
                            <div className="font-medium">Team Invitation</div>
                            <div className="text-sm text-muted-foreground">
                              Invited as {invitation.role.replace('_', ' ')} • 
                              Expires {new Date(invitation.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getRoleBadge(invitation.role)}
                            <Button
                              onClick={() => handleAcceptInvitation(invitation)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          )}

          {/* Info Alert */}
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Team Invitations:</strong> When you invite someone, you'll get a shareable link to send them manually. 
                  Invited users will also see notifications in their <strong>Settings page</strong> where they can accept or reject invitations.
                </p>
                <p className="text-sm">
                  💡 <strong>Tip:</strong> Invited users should check their Settings page → Team Invitations section to accept invitations.
                </p>
              </div>
              <Button variant="link" className="p-0 mt-2 h-auto" asChild>
                <a href="/team/guide">Learn more about team management →</a>
              </Button>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team Members */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatedCard>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Team Members
                      </CardTitle>
                      <CardDescription>
                        {isPersonalAccount 
                          ? `Users with access to your account (${teamMembers.length} members)`
                          : `Team members for this account (${teamMembers.length} members)`
                        }
                        {!canManageTeam && role && (
                          <span className="block mt-1 text-xs">
                            Your role: <Badge variant="outline" className="ml-1">{role}</Badge>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {/* Only show invite button for owners and admins */}
                    {canManageTeam && isPersonalAccount && (
                      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            Invite User
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                          <DialogDescription>
                            Create an invitation for a new team member. You'll get a shareable link to send them manually. They can also accept invitations from their Settings page.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="user@example.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer - Can view data only</SelectItem>
                                <SelectItem value="manager">Manager - Can manage releases and settings</SelectItem>
                                <SelectItem value="account_admin">Admin - Full access including team management</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {manualInviteLink && (
                            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                <div className="space-y-3">
                                  <p className="font-medium text-green-800 dark:text-green-200">Invitation created successfully!</p>
                                  <div>
                                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">Share this link with {inviteEmail}:</p>
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        value={manualInviteLink} 
                                        readOnly 
                                        className="text-xs bg-white"
                                      />
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => copyInviteLink(manualInviteLink)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="text-sm text-green-700 dark:text-green-300">
                                    <p><strong>Alternative:</strong> {inviteEmail} can also check their <strong>Settings page → Team Invitations</strong> section to accept this invitation.</p>
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="flex gap-3 pt-4">
                            <Button 
                              onClick={handleInviteUser} 
                              disabled={submitting || !inviteEmail.trim()}
                              className="flex-1"
                            >
                              {submitting ? 'Creating Invitation...' : 'Create Invitation'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsInviteDialogOpen(false);
                                setManualInviteLink(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    )}
                    {!canManageTeam && isPersonalAccount && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        View Only
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {teamMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No team members yet. Invite someone to get started.</p>
                        <p className="text-sm mt-2">Note: You are the account owner and have full access.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Member</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Added</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {member.user_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {member.user_email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {canManageTeam && isPersonalAccount ? (
                                    <Select 
                                      value={member.role} 
                                      onValueChange={(newRole: 'account_admin' | 'manager' | 'viewer') => 
                                        handleUpdateMemberRole(member.id, member.user_email || '', member.role, newRole)
                                      }
                                    >
                                      <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="account_admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    getRoleBadge(member.role)
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(member.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {/* Only show remove button for owners and admins */}
                                  {canManageTeam && isPersonalAccount ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={() => handleRemoveTeamMember(member.id, member.user_email)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Remove Access
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <AnimatedCard delay={100}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Pending Invitations
                      </CardTitle>
                      <CardDescription>
                        Invitations waiting for acceptance ({invitations.length} pending)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {invitations.map((invitation) => {
                          const inviteUrl = `${window.location.origin}/team/accept-invitation?token=${invitation.token}`;
                          return (
                            <div key={invitation.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <div className="flex-1">
                                <div className="font-medium">{invitation.invited_email}</div>
                                <div className="text-sm text-muted-foreground">
                                  Invited as {invitation.role.replace('_', ' ')} • 
                                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getRoleBadge(invitation.role)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInviteEmail(invitation)}
                                  disabled={sendingEmail}
                                  title="Resend invitation email"
                                >
                                  {sendingEmail ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyInviteLink(inviteUrl)}
                                  title="Copy invitation link"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <AnimatedCard delay={200}>
                <Card>
                  <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="font-medium text-sm mb-2">Account Admin</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Full account access</li>
                        <li>• Manage team members</li>
                        <li>• All manager permissions</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-2">Manager</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Create and manage releases</li>
                        <li>• Process withdrawals</li>
                        <li>• Update account settings</li>
                        <li>• All viewer permissions</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-2">Viewer</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• View releases and analytics</li>
                        <li>• View earnings data</li>
                        <li>• Read-only access</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              <AnimatedCard delay={300}>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">Security Note</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      Only invite trusted individuals to your account. 
                      Team members with manager or admin roles can make 
                      significant changes to your account and releases.
                    </p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

// Wrap with subscription gate - requires subscription to access team management
const TeamPage = () => {
  return (
    <SubscriptionGate fallbackMessage="You need an active subscription to manage team access.">
      <Team />
    </SubscriptionGate>
  );
};

export default TeamPage;
