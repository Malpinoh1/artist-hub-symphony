import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  loading: boolean;
  isAdmin: boolean;
}

export const useSubscriptionCheck = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    loading: true,
    isAdmin: false
  });

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc('user_is_admin', { user_id: session.user.id });

      // Check subscription status
      const { data: subData } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setStatus({
        subscribed: subData?.subscribed || false,
        subscription_tier: subData?.subscription_tier || null,
        subscription_end: subData?.subscription_end || null,
        loading: false,
        isAdmin: adminCheck || false
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const hasAccess = () => {
    return status.isAdmin || status.subscribed;
  };

  return {
    ...status,
    hasAccess,
    refreshStatus: checkSubscriptionStatus
  };
};