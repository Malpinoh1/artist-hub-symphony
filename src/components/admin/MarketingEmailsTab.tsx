
import React, { useState, useEffect } from 'react';
import { Send, Users, Mail, CheckCircle, AlertCircle, Sparkles, Globe, RefreshCw } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<string>('');
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
      console.log('Fetching marketing recipients...');
      
      // Fetch all profiles first for debugging
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, full_name, username, marketing_emails')
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('Error fetching all profiles:', allError);
        throw allError;
      }

      console.log('All profiles found:', allProfiles?.length || 0);
      console.log('All profiles data:', allProfiles);

      // Filter for opted-in users
      const optedInUsers = allProfiles?.filter(profile => profile.marketing_emails === true) || [];
      console.log('Opted-in users:', optedInUsers.length);
      console.log('Opted-in users data:', optedInUsers);

      // Set debug info
      const debugText = `
Total profiles: ${allProfiles?.length || 0}
Opted-in users: ${optedInUsers.length}
Null marketing_emails: ${allProfiles?.filter(p => p.marketing_emails === null).length || 0}
False marketing_emails: ${allProfiles?.filter(p => p.marketing_emails === false).length || 0}
True marketing_emails: ${allProfiles?.filter(p => p.marketing_emails === true).length || 0}
      `.trim();
      
      setDebugInfo(debugText);
      setRecipients(optedInUsers as MarketingRecipient[]);

      toast({
        title: "Recipients loaded",
        description: `Found ${optedInUsers.length} users opted into marketing emails.`,
      });

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

      console.log(`Sending marketing emails to ${recipients.length} recipients...`);

      // Send emails to all opted-in recipients
      for (const recipient of recipients) {
        try {
          const userEmail = recipient.username; // username is the email
          if (userEmail && userEmail.includes('@')) {
            console.log(`Sending email to: ${userEmail}`);
            
            const result = await sendMarketingEmail(
              userEmail,
              recipient.full_name || recipient.username.split('@')[0] || 'User',
              emailData.subject,
              emailData.content,
              emailData.actionLabel || undefined,
              emailData.actionUrl || undefined
            );

            if (result.success) {
              successCount++;
              console.log(`✓ Email sent successfully to ${userEmail}`);
            } else {
              failureCount++;
              console.error(`✗ Failed to send email to ${userEmail}:`, result.error);
            }
          } else {
            failureCount++;
            console.error(`✗ Invalid email for user ${recipient.id}: ${userEmail}`);
          }
        } catch (error) {
          failureCount++;
          console.error(`✗ Error sending email to recipient ${recipient.id}:`, error);
        }
      }

      console.log(`Email campaign completed. Success: ${successCount}, Failed: ${failureCount}`);

      toast({
        title: "Marketing Campaign Sent",
        description: `Successfully delivered to ${successCount} recipients. ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
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

  const getPreviewContent = () => {
    return emailData.content || "Your marketing message will appear here...";
  };

  return (
    <div className="space-y-6">
      {/* Header with MALPINOHdistro Branding */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">MALPINOHdistro Marketing</h2>
            <p className="text-blue-100">Send professional marketing emails to your community</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-blue-100">
          <Globe className="w-5 h-5" />
          <span className="text-sm">SSL Secured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composition */}
        <Card className="lg:col-span-2 border-l-4 border-l-blue-500">
          <CardHeader className="bg-slate-50 dark:bg-slate-800">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Compose Marketing Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Subject *
              </Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="e.g., Exclusive New Music Release from MALPINOHdistro"
                className="border-slate-300 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Content *
              </Label>
              <Textarea
                id="content"
                value={emailData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Write your marketing message here... You can use HTML for formatting."
                rows={10}
                className="border-slate-300 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                HTML formatting is supported. This will be sent with MALPINOHdistro branding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actionLabel" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Call-to-Action Button (Optional)
                </Label>
                <Input
                  id="actionLabel"
                  value={emailData.actionLabel}
                  onChange={(e) => handleInputChange('actionLabel', e.target.value)}
                  placeholder="e.g., Listen Now, Visit Store"
                  className="border-slate-300 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actionUrl" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Button URL (Optional)
                </Label>
                <Input
                  id="actionUrl"
                  value={emailData.actionUrl}
                  onChange={(e) => handleInputChange('actionUrl', e.target.value)}
                  placeholder="https://malpinohdistro.com.ng"
                  className="border-slate-300 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email Preview */}
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Preview:</h4>
              <div className="bg-white dark:bg-slate-900 p-4 rounded border text-sm">
                <div className="border-b pb-2 mb-3">
                  <strong>From:</strong> MALPINOHdistro &lt;marketing@malpinohdistro.com.ng&gt;<br/>
                  <strong>Subject:</strong> {emailData.subject || "Your subject line"}
                </div>
                <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                {emailData.actionLabel && emailData.actionUrl && (
                  <div className="mt-4">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      {emailData.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    SSL-Secured Email Delivery
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    All emails are sent via encrypted connections using Resend's secure infrastructure with MALPINOHdistro branding.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSendMarketingEmails}
              disabled={sending || recipients.length === 0 || !emailData.subject.trim() || !emailData.content.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              {sending ? 'Sending Campaign...' : `Send to ${recipients.length} Recipients`}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients Summary */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-green-600" />
              Campaign Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingRecipients ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading recipients...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-full">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Opted-In Users
                      </span>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Ready to receive emails
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {recipients.length}
                  </span>
                </div>

                <Button 
                  onClick={fetchMarketingRecipients} 
                  variant="outline" 
                  size="sm"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  disabled={loadingRecipients}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingRecipients ? 'animate-spin' : ''}`} />
                  Refresh Recipients
                </Button>

                {/* Debug Information */}
                {debugInfo && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Debug Info:</h4>
                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">
                      {debugInfo}
                    </pre>
                  </div>
                )}

                {recipients.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 border-b pb-2">
                      Recipient List:
                    </h4>
                    {recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            {recipient.full_name || recipient.username.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {recipient.username}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      No Recipients Found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
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
