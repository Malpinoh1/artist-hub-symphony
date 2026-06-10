import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AdminRoleKind = 'admin' | 'finance_manager' | 'distribution_manager';

export interface AdminRoleState {
  loading: boolean;
  roles: AdminRoleKind[];
  isAdmin: boolean;          // full super-admin
  isFinance: boolean;        // includes super-admin
  isDistribution: boolean;   // includes super-admin
  hasAnyAdminRole: boolean;
}

export const useAdminRole = (): AdminRoleState => {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    loading: true,
    roles: [],
    isAdmin: false,
    isFinance: false,
    isDistribution: false,
    hasAnyAdminRole: false,
  });

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setState({
        loading: false,
        roles: [],
        isAdmin: false,
        isFinance: false,
        isDistribution: false,
        hasAnyAdminRole: false,
      });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (!active) return;
      const roles = ((data || []).map((r: any) => r.role) as AdminRoleKind[]).filter(Boolean);
      const isAdmin = roles.includes('admin');
      setState({
        loading: false,
        roles,
        isAdmin,
        isFinance: isAdmin || roles.includes('finance_manager'),
        isDistribution: isAdmin || roles.includes('distribution_manager'),
        hasAnyAdminRole:
          isAdmin || roles.includes('finance_manager') || roles.includes('distribution_manager'),
      });
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return state;
};
