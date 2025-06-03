
import React from 'react';
import { Navigate } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
          
        if (data && !error) {
          setIsAdmin(true);
        }
      }
      
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};

export default AdminRoute;
