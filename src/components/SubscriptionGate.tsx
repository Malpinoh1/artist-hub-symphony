import React from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTeamPermissions } from '../hooks/useTeamPermissions';

interface SubscriptionGateProps {
  children: React.ReactNode;
  requireManage?: boolean;
  requireTeamManagement?: boolean;
  fallbackMessage?: string;
}

const GateFallback = ({ icon, title, description, actions }: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
}) => (
  <div className="py-16 px-4">
    <Card className="max-w-md mx-auto">
      <CardContent className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground mb-6 text-sm">{description}</p>
        <div className="flex gap-3 justify-center">{actions}</div>
      </CardContent>
    </Card>
  </div>
);

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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isWebsiteAdmin && !hasSubscription) {
    return (
      <GateFallback
        icon={<Lock className="w-8 h-8 text-muted-foreground" />}
        title="Subscription Required"
        description={fallbackMessage}
        actions={
          <>
            <Button asChild size="sm"><Link to="/pricing">View Pricing</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/contact">Contact Support</Link></Button>
          </>
        }
      />
    );
  }

  if (!hasAccess) {
    return (
      <GateFallback
        icon={<Lock className="w-8 h-8 text-muted-foreground" />}
        title="Access Denied"
        description="You don't have permission to access this account. Please contact the account owner."
        actions={<Button asChild size="sm"><Link to="/dashboard">Go to Dashboard</Link></Button>}
      />
    );
  }

  if (requireManage && !canManage) {
    return (
      <GateFallback
        icon={<Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />}
        title="Manager Access Required"
        description={
          <>
            This feature requires manager or admin permissions.
            {role && <span className="block mt-1 text-xs">Your role: <strong>{role}</strong></span>}
          </>
        }
        actions={<Button asChild size="sm"><Link to="/dashboard">Go to Dashboard</Link></Button>}
      />
    );
  }

  if (requireTeamManagement && !canManageTeam) {
    return (
      <GateFallback
        icon={<Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />}
        title="Admin Access Required"
        description={
          <>
            Managing team members requires admin or owner permissions.
            {role && <span className="block mt-1 text-xs">Your role: <strong>{role}</strong></span>}
          </>
        }
        actions={<Button asChild size="sm"><Link to="/dashboard">Go to Dashboard</Link></Button>}
      />
    );
  }

  return <>{children}</>;
};

export default SubscriptionGate;
