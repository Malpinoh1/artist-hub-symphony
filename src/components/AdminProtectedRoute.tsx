import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) {
        if (active) setChecking(false);
        return;
      }
      const { data, error } = await supabase.rpc('user_is_admin', { user_id: user.id });
      if (!active) return;
      if (error) {
        console.error('Admin check failed:', error);
      }
      console.log('[AdminProtectedRoute] user_is_admin result:', data, 'for', user.id);
      setIsAdmin(data === true);
      setChecking(false);
    };
    check();
    return () => {
      active = false;
    };
  }, [user]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return <NotAdminRedirect />;
  }

  return <>{children}</>;
};

const NotAdminRedirect = () => {
  const { toast } = useToast();
  useEffect(() => {
    toast({
      title: 'Access denied',
      description: 'Admin privileges required.',
      variant: 'destructive',
    });
  }, []);
  return <Navigate to="/dashboard" replace />;
};

export default AdminProtectedRoute;
