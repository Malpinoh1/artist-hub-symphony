
import React from 'react';
import { ArrowLeft, Users, Shield, Mail, CheckCircle, AlertCircle, UserPlus, Settings, Eye, Database, BarChart3, DollarSign } from 'lucide-react';
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
              Everything you need to know about managing team access, roles, permissions, and administrative capabilities
            </p>
          </div>

          {/* Enhanced Overview */}
          <AnimatedCard>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Overview: Team Access System (Subscription Required)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Subscription Required:</strong> Only users with active subscriptions can access dashboard features including analytics, earnings, and team management. Website admins have full control regardless of subscription status.
                  </AlertDescription>
                </Alert>
                <p className="text-muted-foreground">
                  MALPINOHdistro's comprehensive team access system allows seamless collaboration while maintaining security. As the account owner, you have complete control over who can access your distribution account and what they can do.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300">Analytics Access</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">View and manage streaming data, performance metrics, and platform analytics</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold text-green-900 dark:text-green-300">Earnings Management</h3>
                    <p className="text-sm text-green-700 dark:text-green-400">Access earnings data, process withdrawals, and manage financial information</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Database className="w-8 h-8 text-purple-600 mb-2" />
                    <h3 className="font-semibold text-purple-900 dark:text-purple-300">Data Control</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-400">Manage releases, update statistics, and control all account data</p>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Account owners and admins have full control over all analytics and earnings data. Lower-level roles have restricted access based on their permissions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Enhanced Step by Step Process */}
          <AnimatedCard delay={100}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Step-by-Step: Advanced Team Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Strategic Role Assignment</h3>
                      <p className="text-muted-foreground mb-2">
                        Choose the appropriate role based on responsibilities: Viewer for monitoring, Manager for operations, or Admin for full control including analytics and earnings management.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline">Analytics Access</Badge>
                        <Badge variant="outline">Earnings Control</Badge>
                        <Badge variant="outline">Data Management</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Secure Invitation Process</h3>
                      <p className="text-muted-foreground mb-2">
                        Invitations are sent with secure tokens and expire after 7 days. Invited users can accept via email or through their dashboard if they already have an account.
                      </p>
                      <Badge variant="secondary">Multi-channel acceptance</Badge>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">3</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Account Integration</h3>
                      <p className="text-muted-foreground mb-2">
                        Once accepted, team members gain immediate access to your dashboard with role-appropriate permissions. They can switch between personal and team accounts seamlessly.
                      </p>
                      <Badge variant="outline">Seamless switching</Badge>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Full Operational Access</h3>
                      <p className="text-muted-foreground mb-2">
                        Team members can now perform their designated tasks including analytics monitoring, earnings management, and data updates based on their role permissions.
                      </p>
                      <Badge className="bg-green-100 text-green-800">Fully operational</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Enhanced Roles and Permissions */}
          <AnimatedCard delay={200}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Comprehensive Roles and Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-gray-600" />
                      <Badge variant="outline">Viewer</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Analytics & Monitoring</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• View all releases and status</li>
                      <li>• Access analytics dashboard</li>
                      <li>• Monitor streaming performance</li>
                      <li>• View earnings data</li>
                      <li>• Check withdrawal history</li>
                      <li>• Export reports (read-only)</li>
                      <li>• <strong>Cannot modify any data</strong></li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <Badge className="bg-blue-100 text-blue-800">Manager</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Full Operations Management</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All viewer permissions</li>
                      <li>• Create and manage releases</li>
                      <li>• Update streaming statistics</li>
                      <li>• Process withdrawal requests</li>
                      <li>• Manage streaming links</li>
                      <li>• Update earnings data</li>
                      <li>• Configure account settings</li>
                      <li>• <strong>Cannot manage team members</strong></li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-red-600" />
                      <Badge className="bg-red-100 text-red-800">Admin</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">Complete System Control</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All manager permissions</li>
                      <li>• Full analytics management</li>
                      <li>• Complete earnings control</li>
                      <li>• Team member management</li>
                      <li>• Role modifications</li>
                      <li>• System configuration</li>
                      <li>• Data export/import</li>
                      <li>• <strong>Nearly identical to owner</strong></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Analytics & Earnings Management */}
          <AnimatedCard delay={300}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Analytics & Earnings Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Analytics Control
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Update platform streaming data</li>
                      <li>• Modify growth percentages</li>
                      <li>• Manage performance statistics</li>
                      <li>• Control geographic analytics</li>
                      <li>• Export comprehensive reports</li>
                      <li>• Historical data management</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Earnings Management
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Process withdrawal requests</li>
                      <li>• Update earnings records</li>
                      <li>• Manage payment methods</li>
                      <li>• Control available balances</li>
                      <li>• Generate financial reports</li>
                      <li>• Handle payment disputes</li>
                    </ul>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Admin Access Required:</strong> Only users with Admin role or account owners can modify analytics and earnings data. This ensures data integrity and prevents unauthorized changes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Enhanced Security Guidelines */}
          <AnimatedCard delay={400}>
            <Card className="mb-8 border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  Enhanced Security and Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-900">Critical Security Measures</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Only invite absolutely trusted individuals</li>
                      <li>• Regular security audits of team access</li>
                      <li>• Enable two-factor authentication</li>
                      <li>• Monitor unusual access patterns</li>
                      <li>• Immediate revocation when needed</li>
                      <li>• Secure handling of financial data</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-900">Data Protection</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Analytics data is business-critical</li>
                      <li>• Earnings information is highly sensitive</li>
                      <li>• Team members see complete financial picture</li>
                      <li>• Regular permission reviews required</li>
                      <li>• Audit trail for all modifications</li>
                      <li>• Compliance with data protection laws</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Enhanced FAQ */}
          <AnimatedCard delay={500}>
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Can team members modify analytics and earnings data?</h3>
                  <p className="text-sm text-muted-foreground">
                    Only users with Admin role or account owners can modify analytics and earnings data. Managers can view and work with this data but cannot make changes. Viewers have read-only access.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">What happens to team access when someone leaves?</h3>
                  <p className="text-sm text-muted-foreground">
                    Immediately remove their access to prevent unauthorized use. They lose all dashboard access instantly, but their personal account remains unaffected. All their previous activities are logged for audit purposes.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">How secure is the financial data access?</h3>
                  <p className="text-sm text-muted-foreground">
                    All financial data is encrypted and access is logged. Team members can only see earnings and withdrawal information relevant to the accounts they manage. Personal banking details are never shared.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Can I limit what analytics data team members see?</h3>
                  <p className="text-sm text-muted-foreground">
                    Currently, team members with access can see all analytics data for the accounts they manage. You can control this by assigning appropriate roles - Viewers for monitoring only, Managers for operational access, and Admins for full control.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">How do I track team member activities?</h3>
                  <p className="text-sm text-muted-foreground">
                    The system maintains audit logs of all activities. You can monitor who accessed what data, when changes were made, and what actions were performed. This helps ensure accountability and security.
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
