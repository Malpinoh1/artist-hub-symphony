import React, { useState } from 'react';
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { sendMarketingEmail } from '@/services/emailService';

const DEFAULT_EMAIL = `Hi MIDE BLAQ,

We’re pleased to let you know that the update you requested for your new release has been completed successfully.

Update completed: Change of producer name.

To finalize distribution of your release, you’ll need to extend or unlock your currently paused subscription.

Subscription renewal: ₦10,000, 3 months (90 days).

Please sign in to your MALPINOHdistro account and renew your subscription using https://www.malpinohdistro.com.ng/billing

Once your payment has been successfully verified and your subscription has been restored, you can proceed with finalizing your distribution.

Thank you for choosing MALPINOHdistro. We appreciate your patience and look forward to helping you get your music distributed.

Best regards,
MALPINOHdistro Support Team
no-reply@malpinohdistro.com.ng`;

const AdminDirectEmailTab = () => {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState('mideblaq001@gmail.com');
  const [subject, setSubject] = useState('Release update completed — renew to finalize distribution');
  const [content, setContent] = useState(DEFAULT_EMAIL);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!recipient.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      toast({ title: 'Check recipient', description: 'Enter a valid recipient email address.', variant: 'destructive' });
      return;
    }
    if (!subject.trim() || !content.trim()) {
      toast({ title: 'Missing email details', description: 'Subject and message are required.', variant: 'destructive' });
      return;
    }
    if (!confirmed) {
      toast({ title: 'Confirmation required', description: 'Confirm the recipient and message before sending.', variant: 'destructive' });
      return;
    }

    setSending(true);
    setSent(false);
    try {
      const htmlContent = content
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="margin:0 0 16px;white-space:pre-line;">${paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('');
      const result = await sendMarketingEmail(
        recipient.trim(),
        'MIDE BLAQ',
        subject.trim(),
        htmlContent,
        'Renew Subscription',
        'https://www.malpinohdistro.com.ng/billing'
      );

      if (!result.success) throw new Error(result.error || 'The email service rejected the request.');
      setSent(true);
      toast({ title: 'Email request accepted', description: `The email service accepted the message for ${recipient.trim()}.` });
      setConfirmed(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send the email.';
      toast({ title: 'Email failed', description: message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
        <Mail className="h-8 w-8" />
        <div>
          <h2 className="text-xl font-bold">Send a Direct Email</h2>
          <p className="text-sm text-blue-100">Compose and send a one-to-one message through the configured email service.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Prepared email — MIDE BLAQ</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="direct-email-to">Recipient email</Label>
            <Input id="direct-email-to" type="email" value={recipient} onChange={(e) => { setRecipient(e.target.value); setConfirmed(false); setSent(false); }} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-email-subject">Subject</Label>
            <Input id="direct-email-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setConfirmed(false); setSent(false); }} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-email-content">Message</Label>
            <Textarea id="direct-email-content" value={content} onChange={(e) => { setContent(e.target.value); setConfirmed(false); setSent(false); }} rows={16} className="resize-y" required />
            <p className="text-xs text-muted-foreground">The message is wrapped in MALPINOHdistro’s configured branded email template with a renewal button.</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="direct-email-confirm" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />
              <Label htmlFor="direct-email-confirm" className="cursor-pointer text-sm leading-5">
                I have checked the recipient, subject, and message and authorize sending this email.
              </Label>
            </div>
          </div>

          {sent && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              The email service accepted the send request. This confirms the request was accepted, not inbox delivery.
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            This sends only to the recipient above; it does not send a campaign to marketing subscribers.
          </div>
          <Button onClick={handleSend} disabled={sending || !confirmed || !recipient.trim() || !subject.trim() || !content.trim()} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending…' : 'Send Email'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDirectEmailTab;
