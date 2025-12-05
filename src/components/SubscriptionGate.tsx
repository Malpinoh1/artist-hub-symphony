import React from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import Navbar from './Navbar';
import Footer from './Footer';

interface SubscriptionGateProps {
  children: React.ReactNode;
  requireManage?: boolean;
  requireTeamManagement?: boolean;
  fallbackMessage?: string;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children,
  requireManage = false,
  requireTeamManagement = false,
  fallbackMessage = "You need an active subscription to access this feature."
}) => {
  const { 
    isLoading, 
    hasAccess, 
    canManage, 
    canManageTeam,
    hasSubscription,
    isWebsiteAdmin,
    role
  } = useTeamPermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking access...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check subscription access first
  if (!isWebsiteAdmin && !hasSubscription) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Subscription Required</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {fallbackMessage}
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Contact Support</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check role-based access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                You don't have permission to access this account. Please contact the account owner.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check management permission if required
  if (requireManage && !canManage) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Manager Access Required</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                You have viewer access to this account, but this feature requires manager or admin permissions.
                {role && <span className="block mt-2 text-sm">Your current role: <strong>{role}</strong></span>}
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check team management permission if required
  if (requireTeamManagement && !canManageTeam) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Admin Access Required</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Managing team members requires admin or owner permissions.
                {role && <span className="block mt-2 text-sm">Your current role: <strong>{role}</strong></span>}
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGate;
