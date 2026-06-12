import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  const { user, isLoading } = useAuth();
  const { loading: roleLoading, hasAnyAdminRole } = useAdminRole();

  if (isLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={hasAnyAdminRole ? '/admin' : redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
