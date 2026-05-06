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

      // Ensure the supabase client has the active session before checking
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;

      let admin = false;

      // Primary: RPC using auth.uid() default (most reliable when session is attached)
      const rpcDefault = await supabase.rpc('user_is_admin');
      if (rpcDefault.data === true) admin = true;
      if (rpcDefault.error) console.warn('[AdminProtectedRoute] rpc default error:', rpcDefault.error);

      // Secondary: RPC with explicit user_id
      if (!admin) {
        const rpcExplicit = await supabase.rpc('user_is_admin', { user_id: user.id });
        if (rpcExplicit.data === true) admin = true;
        if (rpcExplicit.error) console.warn('[AdminProtectedRoute] rpc explicit error:', rpcExplicit.error);
      }

      // Fallback: direct query
      if (!admin) {
        const { data: rows, error: rowsErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        if (rowsErr) console.warn('[AdminProtectedRoute] direct query error:', rowsErr);
        if (rows && rows.length > 0) admin = true;
      }

      if (!active) return;
      console.log('[AdminProtectedRoute] final isAdmin:', admin, 'for', user.id, 'session?', !!sessionData.session);
      setIsAdmin(admin);
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
