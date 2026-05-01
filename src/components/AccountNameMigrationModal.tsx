import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Forces artists to set their account_name (must match how they appear on
 * ONErpm) on first login after this feature ships.
 */
const AccountNameMigrationModal: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [defaultName, setDefaultName] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('artists')
          .select('account_name, name')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data && (!data.account_name || data.account_name.trim() === '')) {
          setDefaultName(data.name || '');
          setAccountName(data.name || '');
          setOpen(true);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = async () => {
    const trimmed = accountName.trim();
    if (!trimmed) {
      toast.error('Account Name is required');
      return;
    }
    setSaving(true);
    try {
      // Check duplicates
      const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .ilike('account_name', trimmed)
        .neq('id', user!.id)
        .maybeSingle();
      if (existing) {
        toast.error('This Account Name is already taken');
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from('artists')
        .update({ account_name: trimmed })
        .eq('id', user!.id);
      if (error) throw error;
      toast.success('Account Name saved');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (checking) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissible */ }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Your Account Name</DialogTitle>
          <DialogDescription>
            Required to receive your royalties.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please set your <strong>Account Name</strong> to match your artist name as it appears on distribution platforms (e.g. ONErpm). This is how we match royalty payouts to you.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Account Name *</Label>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Liolizzy"
          />
          {defaultName && defaultName !== accountName && (
            <p className="text-xs text-muted-foreground">Profile name: {defaultName}</p>
          )}
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save & Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AccountNameMigrationModal;
