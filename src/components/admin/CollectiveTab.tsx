import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Check, X, HelpCircle, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  roles: string[];
  other_role: string | null;
  social_links: string[] | null;
  why_join: string;
  contribution: string;
  referral_code: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Stats {
  pending: number;
  under_review: number;
  needs_information: number;
  approved: number;
  rejected: number;
  members_active: number;
  referrals_total: number;
  referrals_qualified: number;
  referrals_active: number;
}

const FILTERS = ['pending', 'under_review', 'needs_information', 'approved', 'rejected', 'all'] as const;

const statusClass = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    case 'rejected':
      return 'text-destructive border-destructive/30 bg-destructive/10';
    case 'needs_information':
      return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
    case 'under_review':
      return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
    default:
      return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
  }
};

const CollectiveTab = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('collective_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (filter !== 'all') query = query.eq('status', filter as any);

    const [{ data: appData, error: appErr }, { data: statsData, error: statsErr }] = await Promise.all([
      query,
      supabase.rpc('get_collective_admin_stats'),
    ]);

    if (appErr) toast.error(appErr.message);
    if (statsErr) toast.error(statsErr.message);
    setApps((appData as unknown as Application[]) ?? []);
    setStats((statsData as unknown as Stats) ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, status: string) => {
    setActing(id + status);
    try {
      const { data, error } = await supabase.functions.invoke('collective-review', {
        body: { application_id: id, status, note: notes[id] ?? null },
      });
      const payload = data as any;
      if (error) throw new Error(payload?.error || error.message);
      if (payload?.error) throw new Error(payload.error);
      toast.success(
        status === 'approved'
          ? `Approved${payload?.handle ? ` — handle @${payload.handle}` : ''}`
          : `Application marked ${status.replace(/_/g, ' ')}`
      );
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Review failed');
    } finally {
      setActing(null);
    }
  };

  const statCards = stats
    ? [
        { label: 'Pending', value: stats.pending },
        { label: 'Under review', value: stats.under_review },
        { label: 'Needs info', value: stats.needs_information },
        { label: 'Approved', value: stats.approved },
        { label: 'Active members', value: stats.members_active },
        { label: 'Referrals', value: stats.referrals_total },
        { label: 'Qualified referrals', value: stats.referrals_qualified },
        { label: 'Rejected', value: stats.rejected },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> MDISTRO Collective
        </h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize',
              filter === f
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : apps.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">No applications in this view.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const open = expanded === app.id;
            return (
              <div key={app.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.city ? `${app.city}, ` : ''}
                      {app.country} · {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                        statusClass(app.status)
                      )}
                    >
                      {app.status.replace(/_/g, ' ')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : app.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(app.roles ?? []).map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded-full bg-muted text-[11px] capitalize">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {app.other_role && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-[11px]">{app.other_role}</span>
                  )}
                </div>

                {open && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {app.phone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Phone: </span>
                        {app.phone}
                      </p>
                    )}
                    {app.referral_code && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Referred by: </span>@{app.referral_code}
                      </p>
                    )}
                    {app.social_links?.length ? (
                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">Links</p>
                        {app.social_links.map((l) => (
                          <a
                            key={l}
                            href={l}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block text-primary break-all hover:underline"
                          >
                            {l}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="text-sm">
                      <p className="text-muted-foreground">Why join</p>
                      <p className="whitespace-pre-wrap">{app.why_join}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Contribution</p>
                      <p className="whitespace-pre-wrap">{app.contribution}</p>
                    </div>

                    <Textarea
                      rows={2}
                      placeholder="Optional note to include in the applicant's email"
                      value={notes[app.id] ?? app.admin_notes ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => review(app.id, 'approved')}
                        disabled={acting !== null}
                      >
                        {acting === app.id + 'approved' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(app.id, 'needs_information')}
                        disabled={acting !== null}
                      >
                        <HelpCircle className="h-4 w-4 mr-2" /> Request info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(app.id, 'under_review')}
                        disabled={acting !== null}
                      >
                        <Eye className="h-4 w-4 mr-2" /> Mark under review
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => review(app.id, 'rejected')}
                        disabled={acting !== null}
                      >
                        <X className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollectiveTab;
