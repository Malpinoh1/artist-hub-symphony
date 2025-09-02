import React, { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateTwoFactorSecret, enableTwoFactor, disableTwoFactor, verifyTwoFactorToken } from '../services/twoFactorService';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  currentlyEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  isOpen,
  onClose,
  currentlyEnabled,
  onStatusChange
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'setup' | 'verify' | 'disable'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && !currentlyEnabled) {
      initiate2FASetup();
    } else if (isOpen && currentlyEnabled) {
      setStep('disable');
    }
  }, [isOpen, currentlyEnabled]);

  const initiate2FASetup = async () => {
    try {
      setLoading(true);
      const setupData = await generateTwoFactorSecret();
      setQrCode(setupData.qrCodeUrl);
      setSecret(setupData.secret);
      setBackupCodes(setupData.backupCodes);
      setStep('setup');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate 2FA setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Secret key copied to clipboard"
    });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard"
    });
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const success = await enableTwoFactor(verificationCode, secret);
      
      if (success) {
        toast({
          title: "2FA Enabled!",
          description: "Two-factor authentication has been successfully enabled for your account."
        });
        onStatusChange(true);
        onClose();
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
        description: "Failed to enable 2FA. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your password to disable 2FA",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const success = await disableTwoFactor(password);
      
      if (success) {
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled for your account."
        });
        onStatusChange(false);
        onClose();
      } else {
        toast({
          title: "Invalid password",
          description: "The password is incorrect. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <img src={qrCode} alt="QR Code" className="mx-auto mb-4 border rounded-lg" />
        <p className="text-sm text-muted-foreground mb-4">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>
      </div>

      <div>
        <Label>Manual Entry Key</Label>
        <div className="flex gap-2 mt-1">
          <Input value={secret} readOnly className="font-mono text-sm" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copySecret}
            className="shrink-0"
          >
            {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          If you can't scan the QR code, enter this key manually
        </p>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Backup Codes</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowBackupCodes(!showBackupCodes)}
            >
              {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showBackupCodes ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <Badge key={index} variant="outline" className="justify-center font-mono">
                    {code}
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBackupCodes}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All Codes
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click the eye icon to reveal backup codes</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={() => setStep('verify')} 
          className="flex-1"
          disabled={!showBackupCodes}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold">Verify Your Setup</h3>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div>
        <Label htmlFor="verification-code">Verification Code</Label>
        <Input
          id="verification-code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="text-center text-lg font-mono tracking-widest"
          maxLength={6}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep('setup')} className="flex-1">
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handleVerify} 
          disabled={loading || verificationCode.length !== 6}
          className="flex-1"
        >
          {loading ? 'Verifying...' : 'Enable 2FA'}
        </Button>
      </div>
    </div>
  );

  const renderDisableStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold">Disable Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Enter your password to disable 2FA. This will make your account less secure.
        </p>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Disabling 2FA will reduce your account security. We recommend keeping it enabled.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="button" 
          variant="destructive"
          onClick={handleDisable} 
          disabled={loading || !password}
          className="flex-1"
        >
          {loading ? 'Disabling...' : 'Disable 2FA'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentlyEnabled ? 'Disable Two-Factor Authentication' : 'Setup Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {currentlyEnabled 
              ? 'Disable 2FA for your account'
              : 'Add an extra layer of security to your account'
            }
          </DialogDescription>
        </DialogHeader>

        {loading && step === 'setup' ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Setting up 2FA...</p>
          </div>
        ) : (
          <>
            {step === 'setup' && renderSetupStep()}
            {step === 'verify' && renderVerifyStep()}
            {step === 'disable' && renderDisableStep()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};