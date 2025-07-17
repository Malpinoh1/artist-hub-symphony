
import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Mail, Shield, MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
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
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'account_admin' | 'manager' | 'viewer';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Invitation {
  id: string;
  invited_email: string;
  role: 'account_admin' | 'manager' | 'viewer';
  status: string;
  created_at: string;
  expires_at: string;
}

const Team = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'account_admin' | 'manager' | 'viewer'>('viewer');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session.user);
    await Promise.all([
      fetchTeamMembers(session.user.id),
      fetchInvitations(session.user.id)
    ]);
    setLoading(false);
  };

  const fetchTeamMembers = async (accountOwnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('account_access')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username
          )
        `)
        .eq('account_owner_id', accountOwnerId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive"
      });
    }
  };

  const fetchInvitations = async (accountOwnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('account_owner_id', accountOwnerId)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!user || !inviteEmail.trim()) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('account_invitations')
        .insert({
          account_owner_id: user.id,
          invited_email: inviteEmail.trim().toLowerCase(),
          role: inviteRole
        })
        .select()
        .single();

      if (error) {
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

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail} as ${inviteRole.replace('_', ' ')}`
      });

      setInviteEmail('');
      setInviteRole('viewer');
      setIsInviteDialogOpen(false);
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

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('account_access')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Team member removed",
        description: "The team member has been removed from your account."
      });

      await fetchTeamMembers(user.id);
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Failed to remove member",
        description: "There was an error removing the team member.",
        variant: "destructive"
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('account_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled."
      });

      await fetchInvitations(user.id);
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Failed to cancel invitation",
        description: "There was an error cancelling the invitation.",
        variant: "destructive"
      });
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
              Team Access
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage who has access to your music distribution account
            </p>
          </div>

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
                        Users with access to your account
                      </CardDescription>
                    </div>
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
                            Send an invitation to add a new member to your team.
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
                          <div className="flex gap-3 pt-4">
                            <Button 
                              onClick={handleInviteUser} 
                              disabled={submitting || !inviteEmail.trim()}
                              className="flex-1"
                            >
                              {submitting ? 'Sending...' : 'Send Invitation'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsInviteDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {teamMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No team members yet. Invite someone to get started.</p>
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
                                      {member.profiles?.full_name || member.profiles?.username || 'Unknown User'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getRoleBadge(member.role)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(member.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => handleRemoveTeamMember(member.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove Access
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                        Invitations waiting for acceptance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {invitations.map((invitation) => (
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
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
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

export default Team;
