import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Plus } from 'lucide-react';

interface Props { userId?: string }

interface Alias { id: string; alias: string }

const AccountNameField: React.FC<Props> = ({ userId }) => {
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [addingAlias, setAddingAlias] = useState(false);

  const loadAliases = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('artist_aliases')
      .select('id, alias')
      .eq('artist_id', userId)
      .order('created_at');
    setAliases((data as Alias[]) || []);
  };

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
      loadAliases();
    })();
  }, [userId]);

  const save = async () => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Account Name is required');
      return;
    }
    setSaving(true);
    try {
      const { data: dup } = await supabase
        .from('artists')
        .select('id')
        .eq('account_name', trimmed)
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
      setValue(trimmed);
      setOriginal(trimmed);
      toast.success('Account Name updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const addAlias = async () => {
    const a = newAlias.trim().toLowerCase();
    if (!a) return;
    setAddingAlias(true);
    try {
      const { error } = await supabase
        .from('artist_aliases')
        .insert({ artist_id: userId!, alias: a, created_by: userId });
      if (error) throw error;
      setNewAlias('');
      toast.success('Alias added');
      loadAliases();
    } catch (e: any) {
      toast.error(e.message?.includes('duplicate') ? 'Alias already exists' : (e.message || 'Failed to add alias'));
    } finally {
      setAddingAlias(false);
    }
  };

  const removeAlias = async (id: string) => {
    const { error } = await supabase.from('artist_aliases').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    loadAliases();
  };

  if (loading) return null;
  const dirty = value.trim().toLowerCase() !== original;

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="account_name" className="text-slate-700 dark:text-slate-300">
          Account Name (Royalty Matching) *
        </Label>
        <p className="text-xs text-muted-foreground">
          Must match your artist name as it appears on distribution platforms (e.g. ONErpm). Saved as lowercase.
        </p>
        <div className="flex gap-2">
          <Input
            id="account_name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. liolizzy"
          />
          <Button onClick={save} disabled={!dirty || saving} type="button">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-300">Aliases (Optional)</Label>
        <p className="text-xs text-muted-foreground">
          Add alternate spellings or stage names. Royalty rows matching these aliases will also be credited to you.
        </p>
        <div className="flex flex-wrap gap-2">
          {aliases.map((a) => (
            <Badge key={a.id} variant="secondary" className="gap-1">
              {a.alias}
              <button onClick={() => removeAlias(a.id)} type="button" className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {aliases.length === 0 && <span className="text-xs text-muted-foreground">No aliases yet</span>}
        </div>
        <div className="flex gap-2">
          <Input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="Add alias..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
          />
          <Button onClick={addAlias} disabled={!newAlias.trim() || addingAlias} type="button" variant="outline">
            {addingAlias ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountNameField;
