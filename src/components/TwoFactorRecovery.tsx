import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorRecoveryProps {
  userEmail: string;
  onBack: () => void;
  onRecoverySuccess: () => void;
}

export function TwoFactorRecovery({ userEmail, onBack, onRecoverySuccess }: TwoFactorRecoveryProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(userEmail);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleRequestRecovery = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-recovery', {
        body: { email }
      });

      if (error) throw error;

      setEmailSent(true);
      setStep('verify');
      
      toast({
        title: 'Recovery Email Sent',
        description: 'If your account has 2FA enabled, you will receive a recovery code via email.'
      });
    } catch (error) {
      console.error('Error requesting recovery:', error);
      toast({
        title: 'Error',
        description: 'Failed to send recovery email. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!recoveryCode || recoveryCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit recovery code.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-recovery', {
        body: { email, recoveryCode }
      });

      if (error) throw error;

      toast({
        title: 'Recovery Successful',
        description: 'Two-factor authentication has been disabled. You can now log in with your password.'
      });
      
      onRecoverySuccess();
    } catch (error: any) {
      console.error('Error verifying recovery:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired recovery code.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle>Recover 2FA Access</CardTitle>
          <CardDescription>
            Lost access to your authenticator app? We'll send a recovery code to your email.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This will disable two-factor authentication for your account. You'll need to set it up again after logging in.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="recovery-email">Email Address</Label>
            <Input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleRequestRecovery}
              className="flex-1"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Recovery Code'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle>Enter Recovery Code</CardTitle>
        <CardDescription>
          Check your email for the 6-digit recovery code
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {emailSent && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Recovery code sent to <strong>{email}</strong>. The code expires in 15 minutes.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="recovery-code">Recovery Code</Label>
          <Input
            id="recovery-code"
            value={recoveryCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setRecoveryCode(val);
            }}
            placeholder="000000"
            className="text-center text-lg font-mono tracking-widest"
            maxLength={6}
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep('request')}
            className="flex-1"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleVerifyRecovery}
            className="flex-1"
            disabled={loading || recoveryCode.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify & Disable 2FA'}
          </Button>
        </div>

        <Button
          variant="link"
          onClick={handleRequestRecovery}
          className="w-full text-sm"
          disabled={loading}
        >
          Didn't receive the code? Resend
        </Button>
      </CardContent>
    </Card>
  );
}
