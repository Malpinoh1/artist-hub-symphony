
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Mail, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    checkAuthAndInvitation();
  }, [token]);

  const checkAuthAndInvitation = async () => {
    try {
      console.log('Checking invitation with token:', token);
      
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      console.log('User session:', session?.user ? 'authenticated' : 'not authenticated');

      if (!token) {
        console.log('No token provided');
        setError('Invalid invitation link. No token provided.');
        setLoading(false);
        return;
      }

      // Validate token format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token)) {
        console.log('Invalid token format:', token);
        setError('Invalid invitation link format. Please check your link and try again.');
        setLoading(false);
        return;
      }

      // Fetch invitation details with better error handling
      console.log('Fetching invitation details...');
      const { data: invitationData, error: invitationError } = await supabase
        .from('account_invitations')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      console.log('Invitation query result:', { invitationData, invitationError });

      if (invitationError) {
        console.error('Database error fetching invitation:', invitationError);
        setError('Failed to verify invitation. Please try again or contact support.');
        setLoading(false);
        return;
      }

      if (!invitationData) {
        console.log('No invitation found for token:', token);
        setError('Invalid or expired invitation. Please request a new invitation or check if you already have access to the account.');
        setLoading(false);
        return;
      }

      // Check invitation status
      if (invitationData.status !== 'pending') {
        console.log('Invitation already processed:', invitationData.status);
        if (invitationData.status === 'accepted') {
          setError('This invitation has already been accepted. You should already have access to the account.');
        } else {
          setError(`This invitation has been ${invitationData.status}. Please request a new invitation if needed.`);
        }
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      const expirationDate = new Date(invitationData.expires_at);
      const now = new Date();
      console.log('Checking expiration:', { expirationDate, now, expired: expirationDate < now });
      
      if (expirationDate < now) {
        console.log('Invitation expired');
        setError('This invitation has expired. Please request a new invitation from the team administrator.');
        setLoading(false);
        return;
      }

      // If user is logged in, check if they're already a member
      if (session?.user) {
        const { data: existingAccess } = await supabase
          .from('account_access')
          .select('*')
          .eq('account_owner_id', invitationData.account_owner_id)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (existingAccess) {
          console.log('User already has access');
          setError('You already have access to this account. Please check your dashboard.');
          setLoading(false);
          return;
        }

        // Check if the invitation email matches the logged-in user's email
        if (invitationData.invited_email !== session.user.email) {
          console.log('Email mismatch:', {
            invitedEmail: invitationData.invited_email,
            userEmail: session.user.email
          });
          setError(`This invitation was sent to ${invitationData.invited_email}, but you're logged in as ${session.user.email}. Please log in with the correct account or contact the team administrator.`);
          setLoading(false);
          return;
        }
      }

      console.log('Invitation is valid:', invitationData);
      setInvitation(invitationData);
    } catch (error) {
      console.error('Error checking invitation:', error);
      setError('Failed to verify invitation. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = encodeURIComponent(window.location.href);
      navigate(`/auth?redirect=${returnUrl}`);
      return;
    }

    if (!invitation) return;

    setAccepting(true);
    try {
      console.log('Accepting invitation:', invitation.id);
      
      // Double-check if user is already a member
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
        navigate('/dashboard');
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

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Failed to accept invitation",
        description: "There was an error accepting the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
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
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <AnimatedCard>
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
                  <CardTitle className="text-destructive">Invitation Issue</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="space-y-2">
                    <Button onClick={() => navigate('/team')} variant="outline" className="w-full">
                      Check Team Page
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                      Go to Dashboard
                    </Button>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                      Go to Homepage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
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
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <AnimatedCard>
            <Card>
              <CardHeader className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-primary" />
                <CardTitle>Team Invitation</CardTitle>
                <CardDescription>
                  You've been invited to join a MALPINOHdistro team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Invitation Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Email:</strong> {invitation?.invited_email}</p>
                      <p><strong>Role:</strong> {getRoleBadge(invitation?.role)}</p>
                      <p><strong>Expires:</strong> {new Date(invitation?.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h3 className="font-semibold mb-2 text-primary">Your Permissions</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {invitation?.role === 'account_admin' && (
                        <>
                          <p>• Full account access and control</p>
                          <p>• Manage team members and permissions</p>
                          <p>• All manager and viewer permissions</p>
                        </>
                      )}
                      {invitation?.role === 'manager' && (
                        <>
                          <p>• Create and manage music releases</p>
                          <p>• Process withdrawals and financial operations</p>
                          <p>• Update account settings and preferences</p>
                          <p>• View all analytics and performance data</p>
                        </>
                      )}
                      {invitation?.role === 'viewer' && (
                        <>
                          <p>• View releases and their status</p>
                          <p>• Check earnings and analytics</p>
                          <p>• See withdrawal and payment history</p>
                          <p>• Read-only access to all data</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!user && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to log in or create an account to accept this invitation.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleAcceptInvitation}
                    disabled={accepting}
                    className="w-full"
                    size="lg"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Accepting Invitation...
                      </>
                    ) : user ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Invitation
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Login to Accept
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    By accepting this invitation, you'll gain access to the team's 
                    MALPINOHdistro account with the permissions shown above.
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AcceptInvitation;
