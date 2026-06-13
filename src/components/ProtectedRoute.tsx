import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const { loading: roleLoading, isAdmin, isFinance, isDistribution, hasAnyAdminRole } = useAdminRole();
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Staff-only roles (without full admin) have no artist portal — bounce to their dashboard.
  if (hasAnyAdminRole && !isAdmin) {
    if (isDistribution) return <Navigate to="/admin/distribution" replace />;
    if (isFinance) return <Navigate to="/admin/finance" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};


export default ProtectedRoute;
