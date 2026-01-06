import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  loading: boolean;
  isAdmin: boolean;
  isExpired: boolean;
}

export const useSubscriptionCheck = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    loading: true,
    isAdmin: false,
    isExpired: false
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }
    
    checkSubscriptionStatus(user.id);
  }, [user, authLoading]);

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc('user_is_admin', { user_id: userId });

      // Check subscription status
      const { data: subData } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', userId)
        .maybeSingle();

      // Check if subscription has expired
      let isExpired = false;
      let isStillSubscribed = subData?.subscribed || false;

      if (subData?.subscription_end) {
        const endDate = new Date(subData.subscription_end);
        const now = new Date();
        
        if (endDate < now && subData.subscribed) {
          isExpired = true;
          isStillSubscribed = false;
          
          // Auto-expire the subscription in the database
          await supabase
            .from('subscribers')
            .update({ subscribed: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
      }

      setStatus({
        subscribed: isStillSubscribed,
        subscription_tier: subData?.subscription_tier || null,
        subscription_end: subData?.subscription_end || null,
        loading: false,
        isAdmin: adminCheck || false,
        isExpired
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const hasAccess = () => {
    return status.isAdmin || status.subscribed;
  };

  const refreshStatus = () => {
    if (user) {
      checkSubscriptionStatus(user.id);
    }
  };

  return {
    ...status,
    hasAccess,
    refreshStatus
  };
};
