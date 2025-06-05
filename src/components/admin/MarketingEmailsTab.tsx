
import React, { useState, useEffect } from 'react';
import { Send, Users, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { sendMarketingEmail } from '../../services/emailService';

interface MarketingRecipient {
  id: string;
  full_name: string;
  username: string;
  marketing_emails: boolean;
}

const MarketingEmailsTab = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<MarketingRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    actionLabel: '',
    actionUrl: ''
  });

  useEffect(() => {
    fetchMarketingRecipients();
  }, []);

  const fetchMarketingRecipients = async () => {
    try {
      setLoadingRecipients(true);
      
      // Fetch users who have opted in for marketing emails
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, marketing_emails')
        .eq('marketing_emails', true);

      if (error) throw error;

      setRecipients(data as MarketingRecipient[] || []);
    } catch (error) {
      console.error('Error fetching marketing recipients:', error);
      toast({
        title: "Error",
        description: "Failed to load marketing email recipients.",
        variant: "destructive"
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendMarketingEmails = async () => {
    if (!emailData.subject.trim() || !emailData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both subject and content fields.",
        variant: "destructive"
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "No users have opted in for marketing emails.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSending(true);
      let successCount = 0;
      let failureCount = 0;

      // Send emails to all opted-in recipients
      for (const recipient of recipients) {
        try {
          const userEmail = getUserEmail(recipient);
          if (userEmail) {
            const result = await sendMarketingEmail(
              userEmail,
              recipient.full_name || recipient.username,
              emailData.subject,
              emailData.content,
              emailData.actionLabel || undefined,
              emailData.actionUrl || undefined
            );

            if (result.success) {
              successCount++;
            } else {
              failureCount++;
              console.error(`Failed to send email to ${userEmail}:`, result.error);
            }
          } else {
            failureCount++;
            console.error(`No email found for user ${recipient.id}`);
          }
        } catch (error) {
          failureCount++;
          console.error(`Error sending email to recipient ${recipient.id}:`, error);
        }
      }

      toast({
        title: "Marketing Emails Sent",
        description: `Successfully sent ${successCount} emails. ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        // Clear form on success
        setEmailData({
          subject: '',
          content: '',
          actionLabel: '',
          actionUrl: ''
        });
      }

    } catch (error) {
      console.error('Error sending marketing emails:', error);
      toast({
        title: "Error",
        description: "Failed to send marketing emails.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getUserEmail = (recipient: MarketingRecipient) => {
    // Assuming username is the email
    return recipient.username;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Marketing Emails</h2>
          <p className="text-slate-600 dark:text-slate-400">Send promotional emails to opted-in users</p>
        </div>
        <Button onClick={fetchMarketingRecipients} variant="outline">
          <Users className="w-4 h-4 mr-2" />
          Refresh Recipients
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composition */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Compose Marketing Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <Label htmlFor="content">Email Content *</Label>
              <Textarea
                id="content"
                value={emailData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter your marketing message (HTML supported)"
                rows={8}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="actionLabel">Action Button Label (Optional)</Label>
                <Input
                  id="actionLabel"
                  value={emailData.actionLabel}
                  onChange={(e) => handleInputChange('actionLabel', e.target.value)}
                  placeholder="e.g., Visit Website"
                />
              </div>
              <div>
                <Label htmlFor="actionUrl">Action Button URL (Optional)</Label>
                <Input
                  id="actionUrl"
                  value={emailData.actionUrl}
                  onChange={(e) => handleInputChange('actionUrl', e.target.value)}
                  placeholder="https://malpinohdistro.com.ng"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Security Notice:</strong> All emails are sent via SSL-encrypted connections using Resend's secure infrastructure.
              </p>
            </div>

            <Button 
              onClick={handleSendMarketingEmails}
              disabled={sending || recipients.length === 0}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : `Send to ${recipients.length} Recipients`}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecipients ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading recipients...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Opted In
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-800 dark:text-green-200">
                    {recipients.length}
                  </span>
                </div>

                {recipients.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {recipient.full_name || recipient.username}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No users have opted in for marketing emails yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketingEmailsTab;
