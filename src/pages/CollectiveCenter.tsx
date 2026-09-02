import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Copy, Check, Loader2, Share2, Clock, XCircle,
  CheckCircle2, AlertCircle, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SITE_URL } from '@/lib/site';

interface Summary {
  application: {
    id: string;
    status: string;
    roles: string[];
    other_role: string | null;
    admin_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
  member: {
    id: string;
    handle: string;
    display_name: string;
    roles: string[];
    status: string;
    member_since: string;
    points: number;
  } | null;
  referrals: {
    total: number;
    registered: number;
    verified: number;
    qualified: number;
    active: number;
  };
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; className: string; blurb: string }> = {
  pending: {
    label: 'Pending review',
    icon: Clock,
    className: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
    blurb: 'Your application is in the queue. We will email you once a decision is made.',
  },
  under_review: {
    label: 'Under review',
    icon: Clock,
    className: 'text-blue-500 border-blue-500/30 bg-blue-500/10',
    blurb: 'Our team is currently reviewing your application.',
  },
  needs_information: {
    label: 'More info needed',
    icon: AlertCircle,
    className: 'text-orange-500 border-orange-500/30 bg-orange-500/10',
    blurb: 'We need a little more detail from you — check the note below and reply to our email.',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
    blurb: 'Welcome to the MDISTRO Collective!',
  },
  rejected: {
    label: 'Not approved',
    icon: XCircle,
    className: 'text-destructive border-destructive/30 bg-destructive/10',
    blurb: 'This application was not approved. You are welcome to apply again in the future.',
  },
};

const CollectiveCenter = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_collective_summary');
    if (error) toast.error(error.message);
    setSummary((data as unknown as Summary) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const member = summary?.member ?? null;
  const application = summary?.application ?? null;
  const referralLink = member ? `${SITE_URL}/collective?ref=${member.handle}` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join the MDISTRO Collective',
          text: 'Join me in the MDISTRO Collective — a community for artists, DJs, producers and music professionals.',
          url: referralLink,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copyLink();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusMeta = application ? STATUS_META[application.status] ?? STATUS_META.pending : null;
  const StatusIcon = statusMeta?.icon ?? Clock;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Collective Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your MDISTRO Collective membership, status and referrals.
          </p>
        </div>
        {!application && !member && (
          <Button asChild>
            <Link to="/collective">Apply to join</Link>
          </Button>
        )}
      </header>

      {!application && !member && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 text-center">
          <Users className="h-10 w-10 mx-auto text-primary" />
          <h2 className="mt-4 text-lg font-semibold">You're not in the Collective yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            The MDISTRO Collective connects artists, DJs, producers, promoters and industry
            professionals. Apply to get your referral link and community access.
          </p>
          <Button asChild className="mt-6">
            <Link to="/collective">Start application</Link>
          </Button>
        </div>
      )}

      {application && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusMeta?.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta?.label}
            </span>
            <span className="text-xs text-muted-foreground">
              Submitted {new Date(application.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{statusMeta?.blurb}</p>

          {application.roles?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {application.roles.map((r) => (
                <span key={r} className="px-2.5 py-1 rounded-full bg-muted text-xs capitalize">
                  {r.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {application.admin_notes && (
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Note from our team</p>
              <p className="text-sm">{application.admin_notes}</p>
            </div>
          )}
        </div>
      )}

      {member && (
        <>
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Member</p>
                <h2 className="text-lg font-semibold">{member.display_name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  @{member.handle} · since {new Date(member.member_since).toLocaleDateString()}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
                <Trophy className="h-3.5 w-3.5" /> {member.points ?? 0} points
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Your referral link</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm break-all">
                  {referralLink}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button onClick={shareLink}>
                    <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total referrals', value: summary?.referrals.total ?? 0 },
              { label: 'Registered', value: summary?.referrals.registered ?? 0 },
              { label: 'Qualified', value: summary?.referrals.qualified ?? 0 },
              { label: 'Active', value: summary?.referrals.active ?? 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4"
              >
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CollectiveCenter;
