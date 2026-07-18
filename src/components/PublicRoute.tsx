import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  const { user, isLoading } = useAuth();
  const { loading: roleLoading, isAdmin, isFinance, isDistribution } = useAdminRole();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

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
    if (safeNext) return <Navigate to={safeNext} replace />;
    // Super admin keeps full panel; sub-roles land on their dedicated dashboard.
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isDistribution) return <Navigate to="/admin/distribution" replace />;
    if (isFinance) return <Navigate to="/admin/finance" replace />;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
