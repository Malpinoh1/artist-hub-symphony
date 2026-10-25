import { useState } from 'react';
import { BellRing, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AndroidPushNotificationsTab = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      toast({
        title: 'Missing notification details',
        description: 'Enter both a title and a message.',
        variant: 'destructive',
      });
      return;
    }
    if (cleanTitle.length > 100 || cleanMessage.length > 1000) {
      toast({
        title: 'Notification is too long',
        description: 'The title limit is 100 characters and the message limit is 1,000 characters.',
        variant: 'destructive',
      });
      return;
    }
    if (!confirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Confirm that you want to notify Android app users before sending.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setSent(false);
    try {
      const { data, error } = await supabase.functions.invoke('send-general-push', {
        body: { title: cleanTitle, body: cleanMessage },
      });

      if (error) {
        let serverMessage = error.message;
        try {
          const response = (error as Error & { context?: Response }).context;
          if (response) {
            const details = await response.clone().json();
            if (typeof details?.error === 'string') serverMessage = details.error;
          }
        } catch {
          // Keep the safe default error message if the response is not JSON.
        }
        throw new Error(serverMessage || 'The notification could not be sent.');
      }
      if (!data?.success) throw new Error(data?.error || 'The notification could not be sent.');

      setSent(true);
      setConfirmed(false);
      toast({
        title: 'Notification sent to Firebase',
        description: 'Firebase accepted the announcement for delivery to subscribed Android app installations.',
      });
    } catch (error) {
      toast({
        title: 'Notification failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-white">
        <BellRing className="h-8 w-8 shrink-0" />
        <div>
          <h2 className="text-xl font-bold">Android Push Notifications</h2>
          <p className="text-sm text-blue-100">
            Send a general announcement to Android app installations that subscribed to MALPINOHdistro announcements, including signed-out users.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose an announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="android-push-title">Notification title</Label>
            <Input
              id="android-push-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setConfirmed(false);
                setSent(false);
              }}
              maxLength={100}
              placeholder="e.g. New update available"
              required
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="android-push-message">Message</Label>
            <Textarea
              id="android-push-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setConfirmed(false);
                setSent(false);
              }}
              maxLength={1000}
              rows={5}
              placeholder="Write the announcement Android users should receive…"
              required
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/1,000</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="android-push-confirm"
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
              />
              <Label htmlFor="android-push-confirm" className="cursor-pointer text-sm leading-5">
                I have checked this announcement and authorize sending it to Android app users.
              </Label>
            </div>
          </div>

          {sent && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Firebase accepted the notification request. This does not guarantee every device has received or displayed it.
            </div>
          )}

          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !confirmed || !title.trim() || !message.trim()}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending…' : 'Send Android Notification'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AndroidPushNotificationsTab;
