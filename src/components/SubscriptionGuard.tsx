import React from 'react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Deprecated: the artist portal is now fully open to all logged-in users.
 * Payment is only enforced at release submission. This component is kept as a
 * pass-through to avoid breaking imports.
 */
export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  return <>{children}</>;
};
