import React, { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { verifyTwoFactorToken } from '../services/twoFactorService';

interface TwoFactorLoginProps {
  onVerificationSuccess: () => void;
  onBack: () => void;
  userEmail: string;
}

export const TwoFactorLogin: React.FC<TwoFactorLoginProps> = ({
  onVerificationSuccess,
  onBack,
  userEmail
}) => {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode || (isBackupCode ? verificationCode.length !== 6 : verificationCode.length !== 6)) {
      toast({
        title: "Invalid code",
        description: `Please enter a valid ${isBackupCode ? 'backup' : '6-digit'} code`,
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const tokenToVerify = isBackupCode ? verificationCode.toUpperCase() : verificationCode;
      const isValid = await verifyTwoFactorToken(tokenToVerify, userEmail);
      
      if (isValid) {
        toast({
          title: "Verification successful",
          description: "Welcome back! You are now signed in."
        });
        onVerificationSuccess();
      } else {
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app for {userEmail}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="verification-code">
            {isBackupCode ? 'Backup Code' : 'Verification Code'}
          </Label>
          <Input
            id="verification-code"
            value={verificationCode}
            onChange={(e) => {
              const val = e.target.value;
              const cleaned = isBackupCode
                ? val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
                : val.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(cleaned);
            }}
            placeholder={isBackupCode ? "XXXXXX" : "000000"}
            className="text-center text-lg font-mono tracking-widest mt-1"
            maxLength={6}
          />
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Can't access your authenticator app?{' '}
            <button
              type="button"
              onClick={() => setIsBackupCode(!isBackupCode)}
              className="font-medium text-blue-600 hover:text-blue-700 underline"
            >
              {isBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </button>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            className="flex-1"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};