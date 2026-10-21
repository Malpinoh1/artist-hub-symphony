import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ReferralActivity {
  status: string;
  source: string | null;
  created_at: string;
  qualified_at: string | null;
  label: string;
}

const ReferralHistoryPanel = () => {
  const [items, setItems] = useState<ReferralActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase.rpc('get_my_referral_activity');
    if (error) {
      setFailed(true);
      setItems([]);
    } else {
      setItems((data as unknown as ReferralActivity[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (failed) return (
    <div className="py-12 text-center">
      <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
      <p className="mt-3 text-sm">We couldn't load your referral history.</p>
      <Button variant="outline" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Referral history</h2>
        <p className="text-sm text-muted-foreground mt-1">Private, privacy-preserving activity from your recorded referral relationships. Counts distinguish registrations from qualification.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No referrals recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Share your unique referral link from the Overview tab to invite people to the Collective.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article key={`${item.created_at}-${index}`} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.label || 'Referred participant'}</p>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{item.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Recorded {new Date(item.created_at).toLocaleDateString()}</p>
              {item.qualified_at && <p className="mt-1 text-xs text-muted-foreground">Qualified {new Date(item.qualified_at).toLocaleDateString()}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReferralHistoryPanel;
