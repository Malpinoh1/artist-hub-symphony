import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Save, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const AREAS = [
  'mentoring',
  'playlisting',
  'events',
  'promotion',
  'content_creation',
  'production',
  'a_and_r',
  'community_support',
];

const VISIBILITY: { value: 'public' | 'members' | 'private'; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can see your profile page' },
  { value: 'members', label: 'Members only', hint: 'Only Collective members can see it' },
  { value: 'private', label: 'Private', hint: 'Only you can see it' },
];

interface Props {
  onSaved?: () => void;
}

const ProfilePanel = ({ onSaved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    country: '',
    city: '',
    avatar_url: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    website: '',
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'members' | 'private'>('public');
  const [discoverable, setDiscoverable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('collective_members')
      .select('*')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (data) {
      const links = data.social_links && typeof data.social_links === 'object' && !Array.isArray(data.social_links)
        ? (data.social_links as Record<string, string>)
        : {};
      setForm({
        display_name: data.display_name ?? '',
        bio: data.bio ?? '',
        country: data.country ?? '',
        city: data.city ?? '',
        avatar_url: data.avatar_url ?? '',
        instagram: links.instagram ?? '',
        twitter: links.twitter ?? '',
        tiktok: links.tiktok ?? '',
        website: links.website ?? '',
      });
      setAreas(data.contribution_areas ?? []);
      const savedVisibility = data.visibility;
      setVisibility(savedVisibility === 'public' || savedVisibility === 'private' ? savedVisibility : 'members');
      setDiscoverable(data.discoverable ?? true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.display_name.trim()) {
      toast.error('Please enter a display name.');
      return;
    }
    setSaving(true);
    const social: Record<string, string> = {};
    (['instagram', 'twitter', 'tiktok', 'website'] as const).forEach((k) => {
      const v = form[k].trim();
      if (v) social[k] = v;
    });
    const { error } = await supabase.rpc('update_my_collective_profile', {
      p_display_name: form.display_name.trim() || undefined,
      p_bio: form.bio,
      p_country: form.country.trim() || undefined,
      p_city: form.city.trim() || undefined,
      p_avatar_url: form.avatar_url.trim() || undefined,
      p_social_links: social,
      p_contribution_areas: areas,
      p_visibility: visibility,
      p_discoverable: discoverable,
    });
    setSaving(false);
    if (error) return toast.error("We couldn't update your profile. Please try again.");
    toast.success('Profile updated');
    onSaved?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-14 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">We couldn't load your profile.</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 sm:p-6 space-y-5">
        <h2 className="font-semibold">Your Collective profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="avatar_url">Photo URL</Label>
            <Input
              id="avatar_url"
              placeholder="https://..."
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div>
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            rows={4}
            maxLength={1000}
            placeholder="Tell the community what you do and what you're working on."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/1000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(['instagram', 'twitter', 'tiktok', 'website'] as const).map((k) => (
            <div key={k}>
              <Label htmlFor={k} className="capitalize">
                {k}
              </Label>
              <Input
                id={k}
                placeholder="https://..."
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div>
          <Label>How you can contribute</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAreas(on ? areas.filter((x) => x !== a) : [...areas, a])}
                  className={cn(
                    'h-8 rounded-full px-3 text-xs capitalize',
                    on
                      ? 'border-primary bg-primary/15 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground'
                  )}
                >
                  {a.replace(/_/g, ' ')}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 sm:p-6 space-y-4">
        <h2 className="font-semibold">Privacy</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {VISIBILITY.map((v) => (
            <Button
              key={v.value}
              type="button"
              variant="outline"
              onClick={() => setVisibility(v.value)}
              className={cn(
                'h-auto min-h-20 justify-start whitespace-normal rounded-xl p-3 text-left',
                visibility === v.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              )}
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {v.value === 'private' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {v.label}
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">{v.hint}</span>
              </span>
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Show me in the member directory</p>
            <p className="text-xs text-muted-foreground">Turn off to stay out of directory listings.</p>
          </div>
          <Switch checked={discoverable} onCheckedChange={setDiscoverable} />
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save profile
      </Button>
    </div>
  );
};

export default ProfilePanel;
