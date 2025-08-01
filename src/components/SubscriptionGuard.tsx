import React from 'react';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSubscriptionCheck } from '../hooks/useSubscriptionCheck';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { hasAccess, loading } = useSubscriptionCheck();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!hasAccess()) {
    return fallback || (
      <Alert className="border-amber-200 bg-amber-50/50">
        <Lock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Subscription Required:</strong> You need an active subscription to access this feature.
          </span>
          <div className="flex gap-2 ml-4">
            <Button size="sm" asChild>
              <Link to="/pricing">Upgrade</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};