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
import { supabase } from '../integrations/supabase/client';
import QRCode from 'react-qr-code';

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
  const [otpauthUrl, setOtpauthUrl] = useState<string>('');
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
      const { data, error } = await supabase.functions.invoke('setup-2fa');
      
      if (error) {
        throw error;
      }
      
      setOtpauthUrl(data.otpauthUrl || '');
      setQrCode(data.qrCodeUrl || '');
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (error) {
      console.error('2FA setup error:', error);
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
      const { data, error } = await supabase.functions.invoke('enable-2fa', {
        body: { token: verificationCode, secret }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        toast({
          title: "2FA Enabled!",
          description: "Two-factor authentication has been successfully enabled for your account."
        });
        onStatusChange(true);
        onClose();
      } else {
        toast({
          title: "Invalid code",
          description: data.error || "The verification code is incorrect. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('2FA enable error:', error);
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
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('disable-2fa');
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled for your account."
        });
        onStatusChange(false);
        onClose();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to disable 2FA. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('2FA disable error:', error);
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
        {otpauthUrl ? (
          <div className="mx-auto mb-4 inline-block border rounded-lg p-3 bg-background">
            <QRCode value={otpauthUrl} size={192} />
          </div>
        ) : (
          qrCode ? (
            <img src={qrCode} alt="2FA QR code" className="mx-auto mb-4 border rounded-lg" />
          ) : null
        )}
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
          Are you sure you want to disable 2FA? This will make your account less secure.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Disabling 2FA will reduce your account security. We recommend keeping it enabled to protect your music and earnings.
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
          disabled={loading}
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