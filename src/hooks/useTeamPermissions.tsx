import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useSubscriptionCheck } from './useSubscriptionCheck';

export type AccountRole = 'account_admin' | 'manager' | 'viewer';

export interface TeamPermissions {
  // Basic info
  isLoading: boolean;
  currentAccountId: string | null;
  isPersonalAccount: boolean;
  role: AccountRole | 'owner' | null;
  
  // Permission checks
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isViewer: boolean;
  
  // Access checks
  hasAccess: boolean;
  canView: boolean;
  canManage: boolean;
  canManageTeam: boolean;
  
  // Subscription & Admin checks
  isWebsiteAdmin: boolean;
  hasSubscription: boolean;
  
  // Helpers
  checkPermission: (requiredRole: AccountRole | 'owner') => boolean;
  getEffectiveAccountId: () => string | null;
  refreshPermissions: () => Promise<void>;
}

// Role hierarchy: owner > account_admin > manager > viewer
const roleHierarchy: Record<string, number> = {
  'owner': 4,
  'account_admin': 3,
  'manager': 2,
  'viewer': 1
};

export const useTeamPermissions = (): TeamPermissions => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin: isWebsiteAdmin, subscribed: hasSubscription, loading: subscriptionLoading } = useSubscriptionCheck();
  
  const [role, setRole] = useState<AccountRole | 'owner' | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!user) {
      setRole(null);
      setCurrentAccountId(null);
      setIsLoading(false);
      return;
    }

    try {
      // Check for stored account preference
      const storedAccountId = localStorage.getItem('currentAccountId');
      const effectiveAccountId = storedAccountId || user.id;
      setCurrentAccountId(effectiveAccountId);

      // If viewing own account, user is the owner
      if (effectiveAccountId === user.id) {
        setRole('owner');
        setIsLoading(false);
        return;
      }

      // Otherwise, check account_access for the role
      const { data: accessData, error } = await supabase
        .from('account_access')
        .select('role')
        .eq('account_owner_id', effectiveAccountId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching team permissions:', error);
        setRole(null);
      } else if (accessData) {
        setRole(accessData.role as AccountRole);
      } else {
        // No access to this account - reset to personal
        localStorage.removeItem('currentAccountId');
        setCurrentAccountId(user.id);
        setRole('owner');
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || subscriptionLoading) return;
    fetchPermissions();
  }, [user, authLoading, subscriptionLoading]);

  // Derived permissions
  const permissions = useMemo(() => {
    const isPersonalAccount = currentAccountId === user?.id;
    const isOwner = role === 'owner';
    const isAdmin = role === 'account_admin';
    const isManager = role === 'manager';
    const isViewer = role === 'viewer';
    
    // Website admins bypass all checks
    const hasAccess = isWebsiteAdmin || (hasSubscription && role !== null);
    
    // Permission levels
    const canView = hasAccess && (isOwner || isAdmin || isManager || isViewer);
    const canManage = hasAccess && (isOwner || isAdmin || isManager);
    const canManageTeam = hasAccess && (isOwner || isAdmin);

    const checkPermission = (requiredRole: AccountRole | 'owner'): boolean => {
      if (isWebsiteAdmin) return true;
      if (!hasSubscription || !role) return false;
      
      const userRoleLevel = roleHierarchy[role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
      
      return userRoleLevel >= requiredRoleLevel;
    };

    const getEffectiveAccountId = (): string | null => {
      return currentAccountId || user?.id || null;
    };

    return {
      isLoading: authLoading || subscriptionLoading || isLoading,
      currentAccountId,
      isPersonalAccount,
      role,
      isOwner,
      isAdmin,
      isManager,
      isViewer,
      hasAccess,
      canView,
      canManage,
      canManageTeam,
      isWebsiteAdmin,
      hasSubscription,
      checkPermission,
      getEffectiveAccountId,
      refreshPermissions: fetchPermissions
    };
  }, [
    user, 
    role, 
    currentAccountId, 
    isWebsiteAdmin, 
    hasSubscription, 
    authLoading, 
    subscriptionLoading, 
    isLoading
  ]);

  return permissions;
};

// Helper component to conditionally render based on permissions
export const PermissionGate: React.FC<{
  children: React.ReactNode;
  requiredRole?: AccountRole | 'owner';
  requireManage?: boolean;
  requireView?: boolean;
  requireTeamManagement?: boolean;
  fallback?: React.ReactNode;
}> = ({ 
  children, 
  requiredRole, 
  requireManage = false, 
  requireView = false,
  requireTeamManagement = false,
  fallback = null 
}) => {
  const permissions = useTeamPermissions();
  
  if (permissions.isLoading) {
    return null;
  }

  let hasPermission = true;

  if (requiredRole) {
    hasPermission = permissions.checkPermission(requiredRole);
  }
  
  if (requireManage && hasPermission) {
    hasPermission = permissions.canManage;
  }
  
  if (requireView && hasPermission) {
    hasPermission = permissions.canView;
  }

  if (requireTeamManagement && hasPermission) {
    hasPermission = permissions.canManageTeam;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

