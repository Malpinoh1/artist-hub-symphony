import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, Calendar, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  requirements: string | null;
  instructions: string | null;
  requires_submission: boolean;
  deadline: string | null;
  status: string;
}

interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  status: string;
  message: string | null;
  reviewer_notes: string | null;
  created_at: string;
}
interface Submission {
  id: string;
  opportunity_id: string;
  submission_text: string;
  link: string | null;
  status: string;
  reviewer_notes: string | null;
  evidence_path?: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  submitted: { icon: Clock, className: 'text-amber-500 border-amber-500/30 bg-amber-500/10', label: 'Submitted' },
  under_review: { icon: Clock, className: 'text-blue-500 border-blue-500/30 bg-blue-500/10', label: 'Under review' },
  needs_changes: {
    icon: AlertCircle,
    className: 'text-orange-500 border-orange-500/30 bg-orange-500/10',
    label: 'Needs changes',
  },
  accepted: {
    icon: CheckCircle2,
    className: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
    label: 'Accepted',
  },
  declined: { icon: XCircle, className: 'text-destructive border-destructive/30 bg-destructive/10', label: 'Not accepted' },
};

interface Props {
  memberId: string;
}

const OpportunitiesPanel = ({ memberId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [applications, setApplications] = useState<OpportunityApplication[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const [{ data: oppData, error: oppErr }, { data: subData, error: subErr }, { data: appData, error: appErr }] = await Promise.all([
      supabase
        .from('collective_opportunities')
        .select('*')
        .in('status', ['published', 'closed'])
        .order('created_at', { ascending: false }),
      supabase.from('collective_submissions').select('*').order('created_at', { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Opportunity application table is introduced by the accompanying migration.
      supabase.from('collective_opportunity_applications' as any).select('*').order('created_at', { ascending: false }),
    ]);
    if (oppErr || subErr || appErr) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setOpps((oppData as Opportunity[]) ?? []);
    setSubs((subData as Submission[]) ?? []);
    setApplications((appData as unknown as OpportunityApplication[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitInterest = async (opportunityId: string) => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return toast.error('Please sign in again before applying.');
    setSending(true);
    const existing = applications.find((application) => application.opportunity_id === opportunityId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Opportunity application table is introduced by the accompanying migration.
    const { error } = existing?.status === 'withdrawn'
      ? await supabase.from('collective_opportunity_applications' as any).update({ status: 'submitted', message: null }).eq('id', existing.id).eq('status', 'withdrawn')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Opportunity application table is introduced by the accompanying migration.
      : await supabase.from('collective_opportunity_applications' as any).insert({
          opportunity_id: opportunityId,
          member_id: memberId,
          user_id: auth.user.id,
          message: null,
          status: 'submitted',
        });
    setSending(false);
    if (error) {
      toast.error(error.code === '23505' ? 'You have already applied to this opportunity.' : "We couldn't submit your interest. Please try again.");
      return;
    }
    toast.success('Your interest has been submitted.');
    await load();
  };

  const withdrawInterest = async (application: OpportunityApplication) => {
    setSending(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Opportunity application table is introduced by the accompanying migration.
    const { error } = await supabase.from('collective_opportunity_applications' as any)
      .update({ status: 'withdrawn' })
      .eq('id', application.id)
      .eq('status', 'submitted');
    setSending(false);
    if (error) return toast.error("We couldn't withdraw your application.");
    toast.success('Your application was withdrawn.');
    await load();
  };

  const submit = async (opportunityId: string) => {
    if (text.trim().length < 20) return toast.error('Please describe your contribution (at least 20 characters).');
    if (link.trim()) {
      try {
        const submittedUrl = new URL(link.trim());
        if (!['http:', 'https:'].includes(submittedUrl.protocol)) throw new Error('Unsupported protocol');
      } catch {
        return toast.error('Enter a valid link beginning with https:// or http://.');
      }
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (evidenceFile && (!allowedTypes.includes(evidenceFile.type) || evidenceFile.size > 10 * 1024 * 1024)) {
      return toast.error('Evidence must be a JPG, PNG, WebP or PDF file no larger than 10 MB.');
    }

    setSending(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSending(false);
      toast.error('Please sign in again before submitting.');
      return;
    }

    const existing = subs.find((s) => s.opportunity_id === opportunityId);
    let uploadedPath: string | null = null;
    if (evidenceFile) {
      const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      };
      const objectPath = `${auth.user.id}/${crypto.randomUUID()}.${extensionByType[evidenceFile.type]}`;
      const { error: uploadError } = await supabase.storage
        .from('collective-evidence')
        .upload(objectPath, evidenceFile, { contentType: evidenceFile.type, upsert: false });
      if (uploadError) {
        setSending(false);
        toast.error("We couldn't upload your evidence. Check the file type and size, then try again.");
        return;
      }
      uploadedPath = objectPath;
    }

    const payload = {
      opportunity_id: opportunityId,
      member_id: memberId,
      user_id: auth.user.id,
      submission_text: text.trim(),
      link: link.trim() || null,
      evidence_path: uploadedPath ?? existing?.evidence_path ?? null,
      status: 'submitted',
    };
    const { error } = existing
      ? await supabase
          .from('collective_submissions')
          .update({
            submission_text: payload.submission_text,
            link: payload.link,
            evidence_path: payload.evidence_path,
            status: 'submitted',
          })
          .eq('id', existing.id)
      : await supabase.from('collective_submissions').insert(payload);
    if (error) {
      if (uploadedPath) await supabase.storage.from('collective-evidence').remove([uploadedPath]);
      setSending(false);
      toast.error("We couldn't send your contribution. Please try again.");
      return;
    }
    if (uploadedPath && existing?.evidence_path) {
      await supabase.storage.from('collective-evidence').remove([existing.evidence_path]);
    }
    setSending(false);
    toast.success('Contribution sent for review');
    setOpenId(null);
    setText('');
    setLink('');
    setEvidenceFile(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-14 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">We couldn't load opportunities.</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-semibold">Ways to contribute</h2>
        {opps.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-border bg-card/60 p-6 text-center">
            No opportunities are currently available. New Collective opportunities will appear here when published.
          </p>
        ) : (
          opps.map((o) => {
            const mySub = subs.find((s) => s.opportunity_id === o.id);
            const myApplication = applications.find((application) => application.opportunity_id === o.id);
            const expired = Boolean(o.deadline && new Date(o.deadline).getTime() <= Date.now());
            const closed = o.status === 'closed' || expired;
            const canRevise = mySub?.status === 'submitted' || mySub?.status === 'needs_changes';
            const canSubmit = o.requires_submission && !closed && (!mySub || canRevise);
            return (
              <div key={o.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium">{o.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{o.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {closed && (
                      <span className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground">
                        {expired && o.status !== 'closed' ? 'Expired' : 'Closed'}
                      </span>
                    )}
                    {o.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> {new Date(o.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap">{o.description}</p>
                {o.requirements && (
                  <p className="mt-3 text-sm">
                    <span className="text-muted-foreground">What we need: </span>
                    {o.requirements}
                  </p>
                )}
                {o.instructions && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">How to take part: </span>
                    {o.instructions}
                  </p>
                )}
                {!o.requires_submission && !closed && (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">No contribution attachment is required. You can express interest directly.</p>
                )}

                {!o.requires_submission && myApplication && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize">Application: {myApplication.status.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">Submitted {new Date(myApplication.created_at).toLocaleDateString()}</span>
                    </div>
                    {myApplication.reviewer_notes && <p className="mt-2 text-sm text-muted-foreground">{myApplication.reviewer_notes}</p>}
                    {myApplication.status === 'submitted' && <Button size="sm" variant="outline" className="mt-3" disabled={sending} onClick={() => void withdrawInterest(myApplication)}>Withdraw application</Button>}
                  </div>
                )}
                {!o.requires_submission && !closed && (!myApplication || myApplication.status === 'withdrawn') && (
                  <Button className="mt-4" size="sm" disabled={sending} onClick={() => void submitInterest(o.id)}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {myApplication?.status === 'withdrawn' ? 'Reapply' : 'Express interest'}
                  </Button>
                )}

                {mySub && (
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    {(() => {
                      const meta = STATUS_STYLE[mySub.status] ?? STATUS_STYLE.submitted;
                      const Icon = meta.icon;
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium',
                            meta.className
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      );
                    })()}
                    <span className="text-muted-foreground">
                      sent {new Date(mySub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {mySub?.reviewer_notes && (
                  <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Note from our team</p>
                    <p className="text-sm">{mySub.reviewer_notes}</p>
                  </div>
                )}

                {canSubmit && (
                  <div className="mt-4">
                    {openId === o.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`text-${o.id}`}>Your contribution</Label>
                          <Textarea
                            id={`text-${o.id}`}
                            rows={4}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Describe what you're offering or submitting."
                          />
                        </div>
                        <div>
                          <Label htmlFor={`link-${o.id}`}>Link (optional)</Label>
                          <Input
                            id={`link-${o.id}`}
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`evidence-${o.id}`}>Evidence attachment (optional)</Label>
                          <Input
                            id={`evidence-${o.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">Private upload · JPG, PNG, WebP or PDF · maximum 10 MB</p>
                          {evidenceFile && <p className="mt-1 break-all text-xs">{evidenceFile.name}</p>}
                          {!evidenceFile && mySub?.evidence_path && <p className="mt-1 text-xs text-muted-foreground">Evidence already attached to this submission.</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => submit(o.id)} disabled={sending}>
                            {sending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Send
                          </Button>
                          <Button variant="ghost" onClick={() => setOpenId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setOpenId(o.id);
                          setText(mySub?.submission_text ?? '');
                          setLink(mySub?.link ?? '');
                        }}
                      >
                        {mySub ? 'Update contribution' : 'Take part'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Your contribution history</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-border bg-card/60 p-6 text-center">
            Nothing yet — your contributions will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => {
              const meta = STATUS_STYLE[s.status] ?? STATUS_STYLE.submitted;
              const opp = opps.find((o) => o.id === s.opportunity_id);
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card/60 p-4 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{opp?.title ?? 'Contribution'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', meta.className)}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default OpportunitiesPanel;
