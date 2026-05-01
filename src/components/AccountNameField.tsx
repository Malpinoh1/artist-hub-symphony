import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props { userId?: string }

const AccountNameField: React.FC<Props> = ({ userId }) => {
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('artists')
        .select('account_name')
        .eq('id', userId)
        .maybeSingle();
      const v = data?.account_name || '';
      setValue(v);
      setOriginal(v);
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error('Account Name is required');
      return;
    }
    setSaving(true);
    try {
      const { data: dup } = await supabase
        .from('artists')
        .select('id')
        .ilike('account_name', trimmed)
        .neq('id', userId!)
        .maybeSingle();
      if (dup) {
        toast.error('That Account Name is already taken');
        return;
      }
      const { error } = await supabase
        .from('artists')
        .update({ account_name: trimmed })
        .eq('id', userId!);
      if (error) throw error;
      setOriginal(trimmed);
      toast.success('Account Name updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  const dirty = value.trim() !== original;

  return (
    <div className="space-y-2 border-t pt-4">
      <Label htmlFor="account_name" className="text-slate-700 dark:text-slate-300">
        Account Name (Royalty Matching) *
      </Label>
      <p className="text-xs text-muted-foreground">
        Must match your artist name as it appears on distribution platforms (e.g. ONErpm). Used to match royalty payouts to you.
      </p>
      <div className="flex gap-2">
        <Input
          id="account_name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Liolizzy"
        />
        <Button onClick={save} disabled={!dirty || saving} type="button">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
};

export default AccountNameField;
