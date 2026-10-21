import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Send, Loader2 } from 'lucide-react';

// TEMPORARY ADMIN-ONLY TOOL: remove after the DANCE - REMIX royalty notices are sent.
const RELEASE = 'DANCE - REMIX';
const notices = [
  {
    key: 'sheglass',
    name: 'SHEGLASS',
    email: 'sheglassmusic@gmail.com',
    share: '40%',
    subject: 'Action required: Accept your 40% royalty share — DANCE - REMIX',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto;color:#222"><h2>MALPINOHdistro — Royalty Split Invitation</h2><p>Hello SHEGLASS,</p><p>You have been assigned a <strong>40% royalty share</strong> for <strong>DANCE - REMIX</strong> by MOSKY BABY.</p><p>Please sign in to your MALPINOHdistro account and review the royalty split invitation in your royalty splits area. Your share remains pending until you accept it in the platform.</p><p>Track: DANCE - REMIX<br>Artist: MOSKY BABY feat. SHEGLASS<br>ISRC: QZNJY2619073</p><p>If you cannot see the invitation or do not have access to the correct account, reply to this email for assistance.</p><p>— MALPINOHdistro</p></div>`,
  },
  {
    key: 'finance',
    name: 'MALPINOHdistro Finance',
    email: 'finance@malpinohdistro.com.ng',
    share: '10%',
    subject: 'Royalty allocation configured — DANCE - REMIX',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;margin:auto;color:#222"><h2>MALPINOHdistro — Finance Notice</h2><p>Hello Finance Team,</p><p>The royalty allocation for <strong>DANCE - REMIX</strong> by MOSKY BABY has been configured as follows:</p><ul><li>MOSKY BABY: 50%</li><li>SHEGLASS: 40% (acceptance pending)</li><li>MALPINOHdistro Finance: 10%</li></ul><p>The platform allocation is intended to be applied when royalty statements are processed. This notice does not indicate that any payout has been made.</p><p>Track ISRC: QZNJY2619073</p><p>— MALPINOHdistro</p></div>`,
  },
];

const TemporaryRoyaltyNoticeTab: React.FC = () => {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});

  const sendNotice = async (notice: typeof notices[number]) => {
    setSending(notice.key);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to: notice.email, subject: notice.subject, html: notice.html },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Email service did not confirm the send.');
      setSent(prev => ({ ...prev, [notice.key]: data.messageId || 'Accepted by email service' }));
      toast.success(`Email accepted by the email service for ${notice.name}`);
    } catch (error: any) {
      toast.error(`Could not send to ${notice.name}: ${error?.message || 'Unknown error'}`);
    } finally {
      setSending(null);
    }
  };

  const sendBoth = async () => {
    for (const notice of notices) {
      if (!sent[notice.key]) await sendNotice(notice);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Temporary Royalty Acceptance Notices</CardTitle>
          <CardDescription>One-off admin tool for the DANCE - REMIX split. Sends the prepared messages below; it does not change any acceptance status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">Allocation</p>
            <p>MOSKY BABY 50% · SHEGLASS 40% · MALPINOHdistro Finance 10%</p>
            <p className="text-muted-foreground mt-1">Release: {RELEASE} · ISRC: QZNJY2619073</p>
          </div>
          {notices.map(notice => (
            <div key={notice.key} className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{notice.name}</p>
                  <p className="text-sm text-muted-foreground">{notice.email} · {notice.share}</p>
                </div>
                {sent[notice.key] ? <Badge variant="secondary">Accepted by email service</Badge> : <Badge variant="outline">Not sent yet</Badge>}
              </div>
              <p className="text-sm font-medium">{notice.subject}</p>
              <Button onClick={() => sendNotice(notice)} disabled={sending !== null || !!sent[notice.key]}>
                {sending === notice.key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {sent[notice.key] ? 'Sent' : 'Send email'}
              </Button>
            </div>
          ))}
          <Button variant="default" onClick={sendBoth} disabled={sending !== null || notices.every(n => !!sent[n.key])} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send all unsent notices
          </Button>
          <p className="text-xs text-muted-foreground">“Accepted by email service” means the email provider accepted the request; it does not guarantee inbox delivery. SHEGLASS must still accept the split in the platform.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemporaryRoyaltyNoticeTab;
