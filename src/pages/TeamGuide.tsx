
import React from 'react';
import { ArrowLeft, Users, Shield, Mail, CheckCircle, AlertCircle, UserPlus, Settings, Eye } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TeamGuide = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <Button variant="ghost" className="mb-4" asChild>
              <a href="/team">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Team Management
              </a>
            </Button>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Complete Guide to Team Access Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about managing team access, roles, and permissions
            </p>
          </div>

          {/* Overview */}
          <AnimatedCard>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Overview: How Team Access Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  MALPINOHdistro's team access system allows you to collaborate with others by giving them specific permissions to manage your music distribution account. You maintain full control as the account owner while delegating responsibilities to trusted team members.
                </p>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> As the account owner, you always retain full control. You can add or remove team members and change their permissions at any time.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Step by Step Process */}
          <AnimatedCard delay={100}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Step-by-Step: Inviting Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Send Invitation</h3>
                      <p className="text-muted-foreground mb-2">
                        Click "Invite User" on your team page, enter their email address, and select their role (Viewer, Manager, or Admin).
                      </p>
                      <Badge variant="outline">Email sent automatically</Badge>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Invitation Email Sent</h3>
                      <p className="text-muted-foreground mb-2">
                        The invited person receives an email with a secure invitation link and details about their role and permissions. The invitation expires in 7 days.
                      </p>
                      <Badge variant="secondary">Pending status</Badge>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">User Accepts Invitation</h3>
                      <p className="text-muted-foreground mb-2">
                        They click the invitation link, create an account (if needed) or log in, and confirm their acceptance of the team invitation.
                      </p>
                      <Badge variant="outline">Account creation required</Badge>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Access Granted</h3>
                      <p className="text-muted-foreground mb-2">
                        The team member now appears in your team list and can access your dashboard with the permissions you assigned to their role.
                      </p>
                      <Badge className="bg-green-100 text-green-800">Active member</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Roles and Permissions */}
          <AnimatedCard delay={200}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Roles and Permissions Explained
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-gray-600" />
                      <Badge variant="outline">Viewer</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Read-Only Access</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• View all releases and their status</li>
                      <li>• Check earnings and analytics</li>
                      <li>• See withdrawal history</li>
                      <li>• Access performance statistics</li>
                      <li>• Cannot make any changes</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <Badge className="bg-blue-100 text-blue-800">Manager</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Full Management</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All viewer permissions</li>
                      <li>• Create and manage releases</li>
                      <li>• Process withdrawal requests</li>
                      <li>• Update account settings</li>
                      <li>• Manage streaming links</li>
                      <li>• Cannot manage team members</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-red-600" />
                      <Badge className="bg-red-100 text-red-800">Admin</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Complete Control</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All manager permissions</li>
                      <li>• Invite and remove team members</li>
                      <li>• Change member roles</li>
                      <li>• Full account access</li>
                      <li>• Nearly same as account owner</li>
                      <li>• Cannot delete the account</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* How Team Members Use the System */}
          <AnimatedCard delay={300}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  How Team Members Access Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">For New Users</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Receive invitation email</li>
                      <li>Click "Accept Invitation" button</li>
                      <li>Create new MALPINOHdistro account</li>
                      <li>Verify email address</li>
                      <li>Access your dashboard with assigned permissions</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">For Existing Users</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Receive invitation email</li>
                      <li>Click "Accept Invitation" button</li>
                      <li>Log in to existing account</li>
                      <li>Confirm invitation acceptance</li>
                      <li>Switch between personal and team accounts</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Managing Team Members */}
          <AnimatedCard delay={400}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Managing Your Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">What You Can Do</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Add new team members anytime</li>
                      <li>• Remove team members instantly</li>
                      <li>• Change member roles and permissions</li>
                      <li>• Cancel pending invitations</li>
                      <li>• Monitor team member activity</li>
                      <li>• View invitation history</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Best Practices</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Start with Viewer role for new members</li>
                      <li>• Only give Admin access to highly trusted individuals</li>
                      <li>• Regularly review team member permissions</li>
                      <li>• Remove access when team members leave</li>
                      <li>• Use clear communication about roles</li>
                      <li>• Document team responsibilities</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Security and Safety */}
          <AnimatedCard delay={500}>
            <Card className="mb-8 border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  Security and Safety Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important Security Notes:</strong>
                  </AlertDescription>
                </Alert>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Only invite people you trust completely</li>
                  <li>• Managers and Admins can make significant changes to your account</li>
                  <li>• Team members can see sensitive financial information</li>
                  <li>• Always verify the email address before sending invitations</li>
                  <li>• Remove team members immediately when they leave your organization</li>
                  <li>• Regularly audit team member permissions</li>
                  <li>• Use two-factor authentication for enhanced security</li>
                </ul>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* FAQ */}
          <AnimatedCard delay={600}>
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">What happens when I remove a team member?</h3>
                  <p className="text-sm text-muted-foreground">
                    They immediately lose access to your account and dashboard. They'll no longer be able to view your data or make changes. Their personal account remains unaffected.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Can team members see my personal information?</h3>
                  <p className="text-sm text-muted-foreground">
                    Team members can only see information related to your music distribution business (releases, earnings, etc.). They cannot access your personal account settings, password, or payment methods.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">What if someone doesn't accept the invitation?</h3>
                  <p className="text-sm text-muted-foreground">
                    Invitations expire after 7 days. You can cancel pending invitations and send new ones if needed. There's no limit to how many invitations you can send.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Can I have multiple people with the same role?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can invite as many team members as you need with any role. For example, you could have multiple Managers or multiple Viewers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default TeamGuide;
