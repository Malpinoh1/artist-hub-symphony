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
    setChecking(true);
    const check = async () => {
      if (!user) {
        if (active) {
          setIsAdmin(false);
          setChecking(false);
        }
        return;
      }

      // Ensure the supabase client has the active session before checking
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;

      let admin = false;

      // Check for ANY admin role (admin, finance_manager, distribution_manager)
      const rpcAny = await supabase.rpc('user_has_any_admin_role');
      if (rpcAny.data === true) admin = true;
      if (rpcAny.error) console.warn('[AdminProtectedRoute] rpc any error:', rpcAny.error);

      // Fallback: direct query
      if (!admin) {
        const { data: rows, error: rowsErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'finance_manager', 'distribution_manager']);
        if (rowsErr) console.warn('[AdminProtectedRoute] direct query error:', rowsErr);
        if (rows && rows.length > 0) admin = true;
      }

      if (!active) return;
      console.log('[AdminProtectedRoute] final isAdmin:', admin, 'for', user.id, 'session?', !!sessionData.session);
      setIsAdmin(admin);
      setChecking(false);
    };
    if (!isLoading) check();
    return () => {
      active = false;
    };
  }, [user, isLoading]);

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
