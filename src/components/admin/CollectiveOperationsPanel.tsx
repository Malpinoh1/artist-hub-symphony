/* eslint-disable @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated Supabase client types. */
import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertCircle, BellRing, BriefcaseBusiness, Check, Loader2, Megaphone, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
}
interface Submission {
  id: string;
  submission_text: string;
  link: string | null;
  status: string;
  reviewer_notes: string | null;
  evidence_path?: string | null;
  created_at: string;
  opportunity_id: string;
  opportunity?: { title?: string } | null;
  member?: { display_name?: string } | null;
}
interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
}
interface Member {
  id: string;
  handle: string;
  display_name: string;
  roles: string[];
  status: string;
  country: string | null;
  member_since: string;
  visibility: string;
  discoverable: boolean;
}
interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_label: string;
  action: string;
  target_table: string;
  target_id: string | null;
  old_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

const CollectiveOperationsPanel = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberReasons, setMemberReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [emailBroadcasts, setEmailBroadcasts] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [opportunityForm, setOpportunityForm] = useState({
    title: '', description: '', category: 'collaboration', requirements: '', instructions: '', deadline: '', requires_submission: true,
  });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'update' });

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [opps, subs, anns, audit, memberResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      supabase.from('collective_opportunities' as any).select('*').order('created_at', { ascending: false }).limit(100),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      supabase.from('collective_submissions' as any)
        .select('id, submission_text, link, evidence_path, status, reviewer_notes, created_at, opportunity_id, opportunity:collective_opportunities(title), member:collective_members(display_name)')
        .order('created_at', { ascending: false }).limit(100),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      supabase.from('collective_announcements' as any).select('*').order('created_at', { ascending: false }).limit(100),
      supabase.rpc('get_collective_audit_logs', { p_limit: 100 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      supabase.from('collective_members' as any).select('id, handle, display_name, roles, status, country, member_since, visibility, discoverable').order('member_since', { ascending: false }).limit(200),
    ]);
    if (opps.error || subs.error || anns.error || audit.error || memberResult.error) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setOpportunities((opps.data as unknown as Opportunity[]) ?? []);
    setSubmissions((subs.data as unknown as Submission[]) ?? []);
    setAnnouncements((anns.data as unknown as Announcement[]) ?? []);
    setAuditLogs((audit.data as unknown as AuditEntry[]) ?? []);
    setMembers((memberResult.data as unknown as Member[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const broadcastMembers = async (kind: 'announcement' | 'opportunity', id: string) => {
    setBroadcastingId(id);
    const { data, error } = await supabase.functions.invoke('collective-notify', {
      body: { action: 'broadcast', kind, id, email: emailBroadcasts },
    });
    setBroadcastingId(null);
    const payload = data as { error?: string; notified?: number; emailed?: number; email_failed?: number } | null;
    if (error || payload?.error) {
      toast.error(payload?.error ?? 'The item was saved, but notifications could not be processed.');
      return;
    }
    if (emailBroadcasts && (payload?.email_failed ?? 0) > 0) {
      toast.error(`In-app notifications processed. ${payload?.email_failed} email delivery/deliveries failed and can be retried.`);
    } else {
      const emailSummary = emailBroadcasts ? ` ${payload?.emailed ?? 0} email(s) sent.` : '';
      toast.success(`${payload?.notified ?? 0} new in-app notification(s) created.${emailSummary}`);
    }
    await load();
  };

  const saveOpportunity = async (event: FormEvent) => {
    event.preventDefault();
    if (opportunityForm.title.trim().length < 3 || opportunityForm.description.trim().length < 20) {
      toast.error('Enter a title and a description of at least 20 characters.');
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      toast.error('Your session has expired. Sign in again.');
      return;
    }
    const opportunityData = {
      title: opportunityForm.title.trim().slice(0, 180),
      description: opportunityForm.description.trim().slice(0, 10000),
      category: opportunityForm.category,
      requirements: opportunityForm.requirements.trim() || null,
      instructions: opportunityForm.instructions.trim() || null,
      deadline: opportunityForm.deadline ? new Date(opportunityForm.deadline).toISOString() : null,
      requires_submission: opportunityForm.requires_submission,
      updated_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
    const { error } = editingOpportunityId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      ? await supabase.from('collective_opportunities' as any).update(opportunityData).eq('id', editingOpportunityId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      : await supabase.from('collective_opportunities' as any).insert({ ...opportunityData, status: 'draft', created_by: auth.user.id });
    setSaving(false);
    if (error) {
      toast.error("We couldn't save the opportunity. Check your permissions and try again.");
      return;
    }
    toast.success(editingOpportunityId ? 'Opportunity updated.' : 'Opportunity saved as draft.');
    setEditingOpportunityId(null);
    setOpportunityForm({ title: '', description: '', category: 'collaboration', requirements: '', instructions: '', deadline: '', requires_submission: true });
    await load();
  };

  const setOpportunityStatus = async (item: Opportunity, status: 'published' | 'closed' | 'draft') => {
    setActingId(item.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
    const { error } = await supabase.from('collective_opportunities' as any).update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) {
      setActingId(null);
      toast.error("We couldn't update the opportunity.");
      return;
    }
    if (status === 'published' && item.status !== 'published') {
      setActingId(null);
      await broadcastMembers('opportunity', item.id);
      return;
    }
    toast.success(status === 'closed' ? 'Opportunity closed.' : status === 'draft' ? 'Opportunity returned to draft.' : 'Opportunity updated.');
    setActingId(null);
    await load();
  };

  const saveAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (announcementForm.title.trim().length < 3 || announcementForm.content.trim().length < 10) {
      toast.error('Enter a title and announcement content.');
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      toast.error('Your session has expired. Sign in again.');
      return;
    }
    const announcementData = {
      title: announcementForm.title.trim().slice(0, 180),
      content: announcementForm.content.trim().slice(0, 10000),
      category: announcementForm.category,
      updated_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
    const { error } = editingAnnouncementId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      ? await supabase.from('collective_announcements' as any).update(announcementData).eq('id', editingAnnouncementId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
      : await supabase.from('collective_announcements' as any).insert({ ...announcementData, status: 'draft', created_by: auth.user.id });
    setSaving(false);
    if (error) {
      toast.error("We couldn't save the announcement. Check your permissions and try again.");
      return;
    }
    toast.success(editingAnnouncementId ? 'Announcement updated.' : 'Announcement saved as draft.');
    setEditingAnnouncementId(null);
    setAnnouncementForm({ title: '', content: '', category: 'update' });
    await load();
  };

  const setAnnouncementStatus = async (item: Announcement, status: 'published' | 'draft') => {
    setActingId(item.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Collective tables are not yet in generated client types.
    const { error } = await supabase.from('collective_announcements' as any).update({
      status,
      published_at: status === 'published' ? (item.published_at ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (error) {
      setActingId(null);
      toast.error("We couldn't update the announcement.");
      return;
    }
    if (status === 'published' && item.status !== 'published') {
      setActingId(null);
      await broadcastMembers('announcement', item.id);
      return;
    }
    toast.success(status === 'draft' ? 'Announcement returned to draft.' : 'Announcement updated.');
    setActingId(null);
    await load();
  };

  const setMemberStatus = async (member: Member, status: 'active' | 'suspended') => {
    const reason = (memberReasons[member.id] ?? '').trim();
    if (reason.length < 10) {
      toast.error('Enter a reason of at least 10 characters before changing membership status.');
      return;
    }
    setActingId(member.id);
    const { data, error } = await supabase.rpc('manage_collective_member', {
      p_member_id: member.id,
      p_status: status,
      p_reason: reason,
    });
    setActingId(null);
    const payload = data as { ok?: boolean; error?: string; already_processed?: boolean } | null;
    if (error || payload?.error) {
      toast.error(payload?.error ?? "We couldn't update the member status.");
      return;
    }
    toast.success(payload?.already_processed ? 'Member status was already set.' : `Member status changed to ${status}.`);
    setMemberReasons((current) => ({ ...current, [member.id]: '' }));
    await load();
  };

  const filteredMembers = members.filter((member) => {
    const term = memberSearch.trim().toLowerCase();
    return !term || member.display_name.toLowerCase().includes(term) || member.handle.toLowerCase().includes(term);
  });

  const prepareEvidenceLink = async (path: string) => {
    const { data, error } = await supabase.storage.from('collective-evidence').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("We couldn't create a secure evidence link.");
      return;
    }
    setEvidenceUrls((current) => ({ ...current, [path]: data.signedUrl }));
  };

  const reviewSubmission = async (item: Submission, status: 'under_review' | 'accepted' | 'declined' | 'needs_changes') => {
    setActingId(item.id + status);
    const { data, error } = await supabase.functions.invoke('collective-notify', {
      body: { action: 'review_submission', submission_id: item.id, status, reviewer_notes: notes[item.id] ?? item.reviewer_notes ?? null },
    });
    setActingId(null);
    const payload = data as { error?: string; already_processed?: boolean } | null;
    if (error || payload?.error) {
      toast.error(payload?.error ?? "We couldn't update the contribution. Refresh and try again.");
      return;
    }
    toast.success(payload?.already_processed ? 'This review was already processed.' : 'Contribution review saved.');
    await load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (failed) return (
    <div className="py-12 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 text-sm">We couldn't load Collective operations.</p>
      <Button variant="outline" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  );

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="text-lg font-semibold">Programme operations</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create opportunities and announcements, and review member contributions. Access is enforced by existing Supabase policies and the notification function.</p>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={emailBroadcasts} onChange={(event) => setEmailBroadcasts(event.target.checked)} />
          Also email active members when publishing or retrying a broadcast
        </label>
      </div>
      <Tabs defaultValue="opportunities" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="min-w-max">
            <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" />Members ({members.length})</TabsTrigger>
            <TabsTrigger value="opportunities"><BriefcaseBusiness className="mr-2 h-4 w-4" />Opportunities</TabsTrigger>
            <TabsTrigger value="contributions"><Check className="mr-2 h-4 w-4" />Contributions ({submissions.length})</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4" />Announcements</TabsTrigger>
            <TabsTrigger value="audit"><AlertCircle className="mr-2 h-4 w-4" />Audit history</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="members" className="space-y-4">
          <div>
            <h3 className="font-medium">Member management</h3>
            <p className="mt-1 text-sm text-muted-foreground">Suspend or reinstate membership through the admin-checked RPC. Every status change requires a reason and is recorded in audit history.</p>
          </div>
          <Input placeholder="Search by display name or handle" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} />
          {filteredMembers.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No members match this search.</p> : filteredMembers.map((member) => (
            <article key={member.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{member.display_name}</h3>
                  <p className="text-xs text-muted-foreground">@{member.handle}{member.country ? ` · ${member.country}` : ''} · joined {new Date(member.member_since).toLocaleDateString()}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{(member.roles ?? []).map((role) => <span key={role} className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">{role.replace(/_/g, ' ')}</span>)}</div>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{member.status}</span>
              </div>
              <Textarea rows={2} minLength={10} placeholder="Required reason for status change (minimum 10 characters)" value={memberReasons[member.id] ?? ''} onChange={(event) => setMemberReasons((current) => ({ ...current, [member.id]: event.target.value }))} />
              {member.status === 'active'
                ? <Button size="sm" variant="destructive" disabled={actingId !== null} onClick={() => void setMemberStatus(member, 'suspended')}>Suspend membership</Button>
                : <Button size="sm" disabled={actingId !== null} onClick={() => void setMemberStatus(member, 'active')}>Reinstate membership</Button>}
            </article>
          ))}
        </TabsContent>
        <TabsContent value="opportunities" className="space-y-4">
          <form onSubmit={saveOpportunity} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <h3 className="font-medium">{editingOpportunityId ? 'Edit opportunity' : 'Create opportunity draft'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="collective-opp-title">Title</Label><Input id="collective-opp-title" required maxLength={180} value={opportunityForm.title} onChange={(e) => setOpportunityForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1"><Label htmlFor="collective-opp-category">Category</Label><select id="collective-opp-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={opportunityForm.category} onChange={(e) => setOpportunityForm((f) => ({ ...f, category: e.target.value }))}><option value="collaboration">Collaboration</option><option value="campaign">Campaign</option><option value="promotion">Promotion</option><option value="event">Event</option><option value="content_creation">Content creation</option><option value="a_and_r">A&R</option><option value="community">Community activity</option><option value="other">Other</option></select></div>
            </div>
            <div className="space-y-1"><Label htmlFor="collective-opp-description">Description</Label><Textarea id="collective-opp-description" required minLength={20} rows={4} value={opportunityForm.description} onChange={(e) => setOpportunityForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="collective-opp-requirements">Requirements (optional)</Label><Textarea id="collective-opp-requirements" rows={2} value={opportunityForm.requirements} onChange={(e) => setOpportunityForm((f) => ({ ...f, requirements: e.target.value }))} /></div>
              <div className="space-y-1"><Label htmlFor="collective-opp-instructions">How to participate (optional)</Label><Textarea id="collective-opp-instructions" rows={2} value={opportunityForm.instructions} onChange={(e) => setOpportunityForm((f) => ({ ...f, instructions: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="collective-opp-deadline">Deadline (optional)</Label><Input id="collective-opp-deadline" type="datetime-local" value={opportunityForm.deadline} onChange={(e) => setOpportunityForm((f) => ({ ...f, deadline: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={opportunityForm.requires_submission} onChange={(e) => setOpportunityForm((f) => ({ ...f, requires_submission: e.target.checked }))} />Members must submit a contribution</label>
            </div>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="mr-2 h-4 w-4" />}{editingOpportunityId ? 'Save changes' : 'Save draft'}</Button>{editingOpportunityId && <Button type="button" variant="outline" onClick={() => { setEditingOpportunityId(null); setOpportunityForm({ title: '', description: '', category: 'collaboration', requirements: '', instructions: '', deadline: '', requires_submission: true }); }}>Cancel edit</Button>}</div>
          </form>
          {opportunities.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No opportunities recorded.</p> : opportunities.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-medium">{item.title}</h3><p className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, ' ')} · created {new Date(item.created_at).toLocaleDateString()}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs capitalize">{item.status}</span></div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditingOpportunityId(item.id); setOpportunityForm({ title: item.title, description: item.description, category: item.category, requirements: item.requirements ?? '', instructions: item.instructions ?? '', deadline: item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : '', requires_submission: item.requires_submission }); }}>Edit</Button>
                {item.status !== 'published' && <Button size="sm" disabled={actingId === item.id || broadcastingId === item.id} onClick={() => void setOpportunityStatus(item, 'published')}><Send className="mr-2 h-4 w-4" />Publish</Button>}
                {item.status === 'published' && <Button size="sm" variant="outline" disabled={broadcastingId === item.id} onClick={() => void broadcastMembers('opportunity', item.id)}><BellRing className="mr-2 h-4 w-4" />Retry notifications</Button>}
                {item.status !== 'closed' && <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void setOpportunityStatus(item, 'closed')}><X className="mr-2 h-4 w-4" />Close</Button>}
                {item.status !== 'draft' && <Button size="sm" variant="ghost" disabled={actingId === item.id} onClick={() => void setOpportunityStatus(item, 'draft')}>Return to draft</Button>}
              </div>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="contributions" className="space-y-3">
          {submissions.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No member contributions have been submitted yet.</p> : submissions.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-medium">{item.opportunity?.title ?? 'Collective opportunity'}</h3><p className="text-xs text-muted-foreground">{item.member?.display_name ?? 'Member'} · {new Date(item.created_at).toLocaleDateString()}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs capitalize">{item.status.replace(/_/g, ' ')}</span></div>
              <p className="whitespace-pre-wrap break-words text-sm">{item.submission_text}</p>
              {item.link && <a href={item.link} target="_blank" rel="noreferrer noopener" className="block break-all text-sm text-primary underline">Open submitted link</a>}
              {item.evidence_path && (
                <div className="flex flex-wrap items-center gap-2">
                  {evidenceUrls[item.evidence_path]
                    ? <a href={evidenceUrls[item.evidence_path]} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline">Open private evidence (expires in 60 seconds)</a>
                    : <Button size="sm" variant="outline" onClick={() => void prepareEvidenceLink(item.evidence_path!)}>Prepare secure evidence link</Button>}
                </div>
              )}
              <Textarea rows={2} placeholder="Member-visible feedback (optional)" value={notes[item.id] ?? item.reviewer_notes ?? ''} onChange={(e) => setNotes((current) => ({ ...current, [item.id]: e.target.value }))} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={actingId !== null} onClick={() => void reviewSubmission(item, 'under_review')}>Under review</Button>
                <Button size="sm" disabled={actingId !== null} onClick={() => void reviewSubmission(item, 'accepted')}><Check className="mr-2 h-4 w-4" />Accept</Button>
                <Button size="sm" variant="outline" disabled={actingId !== null} onClick={() => void reviewSubmission(item, 'needs_changes')}>Request changes</Button>
                <Button size="sm" variant="destructive" disabled={actingId !== null} onClick={() => void reviewSubmission(item, 'declined')}><X className="mr-2 h-4 w-4" />Decline</Button>
              </div>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="announcements" className="space-y-4">
          <form onSubmit={saveAnnouncement} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
            <h3 className="font-medium">{editingAnnouncementId ? 'Edit announcement' : 'Create announcement draft'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="collective-ann-title">Title</Label><Input id="collective-ann-title" required maxLength={180} value={announcementForm.title} onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1"><Label htmlFor="collective-ann-category">Category</Label><select id="collective-ann-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={announcementForm.category} onChange={(e) => setAnnouncementForm((f) => ({ ...f, category: e.target.value }))}><option value="update">Programme update</option><option value="opportunity">Opportunity</option><option value="campaign">Campaign</option><option value="event">Event</option><option value="guidance">Member guidance</option></select></div>
            </div>
            <div className="space-y-1"><Label htmlFor="collective-ann-content">Content</Label><Textarea id="collective-ann-content" required minLength={10} rows={4} value={announcementForm.content} onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))} /></div>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}{editingAnnouncementId ? 'Save changes' : 'Save draft'}</Button>{editingAnnouncementId && <Button type="button" variant="outline" onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm({ title: '', content: '', category: 'update' }); }}>Cancel edit</Button>}</div>
          </form>
          {announcements.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No announcements recorded.</p> : announcements.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-medium">{item.title}</h3><p className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, ' ')} · created {new Date(item.created_at).toLocaleDateString()}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs capitalize">{item.status}</span></div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditingAnnouncementId(item.id); setAnnouncementForm({ title: item.title, content: item.content, category: item.category }); }}>Edit</Button>
                {item.status !== 'published' && <Button size="sm" disabled={actingId === item.id || broadcastingId === item.id} onClick={() => void setAnnouncementStatus(item, 'published')}><Send className="mr-2 h-4 w-4" />Publish</Button>}
                {item.status === 'published' && <Button size="sm" variant="outline" disabled={broadcastingId === item.id} onClick={() => void broadcastMembers('announcement', item.id)}><BellRing className="mr-2 h-4 w-4" />Retry notifications</Button>}
                {item.status === 'published' && <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void setAnnouncementStatus(item, 'draft')}>Return to draft</Button>}
              </div>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="audit" className="space-y-3">
          <div>
            <h3 className="font-medium">Recent audit history</h3>
            <p className="text-sm text-muted-foreground">Latest 100 recorded changes. Sensitive application answers, emails and evidence content are not included in the state snapshots.</p>
          </div>
          {auditLogs.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No audit entries recorded yet.</p> : auditLogs.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{entry.actor_label} · {entry.target_table}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}` : ''}</p>
                </div>
                <time className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</time>
              </div>
              {(entry.old_state || entry.new_state) && <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs">{JSON.stringify({ from: entry.old_state, to: entry.new_state }, null, 2)}</pre>}
              {entry.reason && <p className="mt-2 text-sm text-muted-foreground">{entry.reason}</p>}
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default CollectiveOperationsPanel;
