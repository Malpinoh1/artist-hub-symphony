import React, { useState } from 'react';
import { Send, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { sendMarketingEmail } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';

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
    const email = recipient.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        email,
        'MIDE BLAQ',
        subject.trim(),
        htmlContent,
        'Renew Subscription',
        'https://www.malpinohdistro.com.ng/billing'
      );

      if (!result.success) throw new Error(result.error || 'The email service rejected the request.');

      setSent(true);
      setConfirmed(false);

      // Notify the matching artist account after the email service accepts the send request.
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('id, name')
        .ilike('email', email)
        .maybeSingle();

      if (!artistError && artist?.id) {
        const { error: notificationError } = await supabase.from('notifications' as any).insert({
          user_id: artist.id,
          type: 'release_update',
          title: 'Release update completed',
          message: 'Your producer-name change has been completed. Renew your subscription (₦10,000 for 90 days) to finalize distribution.',
          link: '/billing',
          metadata: { subject: subject.trim(), source: 'admin_direct_email' },
          read: false,
        });
        if (notificationError) {
          console.error('Email accepted but artist notification could not be created:', notificationError);
          toast({
            title: 'Email accepted; notification needs attention',
            description: 'The email request was accepted, but the in-app notification could not be created. Check notification-table permissions.',
            variant: 'destructive',
          });
          return;
        }
        toast({ title: 'Email and account notification queued', description: `The email service accepted the message and a notification was added to ${artist.name || 'the artist'}’s account.` });
      } else {
        console.error('Email accepted but matching artist account was not found:', artistError);
        toast({ title: 'Email request accepted', description: 'The email service accepted the message, but no matching artist account was found for the in-app notification.', variant: 'destructive' });
      }
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
          <p className="text-sm text-blue-100">Compose and send a one-to-one message through the configured email service. A matching artist account also receives an in-app notification.</p>
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

          <Button onClick={handleSend} disabled={sending || !confirmed} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending…' : 'Send Email & Notify Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDirectEmailTab;
