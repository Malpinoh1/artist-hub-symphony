import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Contribution {
  id: string;
  opportunity_id: string;
  submission_text: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const statusLabel = (status: string) => ({
  submitted: 'Submitted',
  under_review: 'Under review',
  needs_changes: 'Changes requested',
  accepted: 'Accepted',
  declined: 'Not accepted',
}[status] ?? status.replace(/_/g, ' '));

const ContributionHistoryPanel = () => {
  const [items, setItems] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const { data, error } = await supabase
      .from('collective_submissions' as any)
      .select('id, opportunity_id, submission_text, status, reviewer_notes, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setFailed(true);
      setItems([]);
    } else {
      setItems((data as unknown as Contribution[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (failed) return (
    <div className="py-12 text-center">
      <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
      <p className="mt-3 text-sm">We couldn't load your contribution history.</p>
      <Button variant="outline" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">My contributions</h2>
        <p className="text-sm text-muted-foreground mt-1">Your submitted activity and the latest review status. Only your own submissions are queried.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No contributions submitted yet</p>
          <p className="mt-1 text-sm text-muted-foreground">When you submit work through an opportunity, its status will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Contribution</p>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs">{statusLabel(item.status)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.submission_text}</p>
              <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(item.created_at).toLocaleDateString()}</p>
              {item.reviewed_at && <p className="mt-1 text-xs text-muted-foreground">Reviewed {new Date(item.reviewed_at).toLocaleDateString()}</p>}
              {item.reviewer_notes && (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Feedback from the team</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{item.reviewer_notes}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ContributionHistoryPanel;
