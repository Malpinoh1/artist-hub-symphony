import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ChevronRight, ChevronLeft, Globe, Clock, ShoppingCart, Music, Scissors, Download, Store, AlertCircle, Info } from 'lucide-react';

type StoreStatus = 'pending' | 'incomplete' | 'delivered';

interface StoreItem {
  name: string;
  enabled: boolean;
  status: StoreStatus;
}

interface StepDistributionPreferencesProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  tracks: any[];
  coverArtPreview: string | null;
  storeSelections: Record<string, StoreItem>;
  onStoreSelectionsChange: (selections: Record<string, StoreItem>) => void;
  freeTrackIds: string[];
  onFreeTrackIdsChange: (ids: string[]) => void;
  audioClips: Record<string, { clip_start: number; clip_end: number }>;
  onAudioClipsChange: (clips: Record<string, { clip_start: number; clip_end: number }>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const ESSENTIAL_STORES = [
  'Spotify', 'Apple Music / iTunes', 'YouTube Music', 'Deezer', 'Tidal',
  'Amazon Music', 'SoundCloud', 'Facebook', 'TikTok', 'Boomplay',
  'Audiomack', 'Anghami', 'Snapchat'
];

const OTHER_STORES = [
  'Claro Música', 'KKBOX', 'NetEase', 'Tencent', 'Saavn', 'JOOX',
  'Trebel', 'Qobuz', 'FLO', 'Rythm', 'Lissen', 'Fizy', 'Kuack'
];

const NEIGHBOURING_RIGHTS = ['SoundExchange'];

const RINGTONE_STORES = ['iTunes Ringtones', 'Claro Ringtones', 'Algar'];

const TERRITORIES = ['World', 'United States', 'Europe', 'Africa', 'Asia', 'Custom Territories'];
const TIMEZONES = ['UTC', 'EST', 'CST', 'MST', 'PST', 'WAT', 'CAT', 'EAT', 'GMT', 'CET', 'IST', 'JST', 'AEST'];

function initStores(): Record<string, StoreItem> {
  const stores: Record<string, StoreItem> = {};
  [...ESSENTIAL_STORES, ...OTHER_STORES, ...NEIGHBOURING_RIGHTS, ...RINGTONE_STORES].forEach(name => {
    stores[name] = { name, enabled: true, status: 'pending' };
  });
  return stores;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'delivered' ? 'default' : status === 'incomplete' ? 'destructive' : 'secondary';
  return <Badge variant={variant} className="text-[10px]">{status}</Badge>;
}

export function StepDistributionPreferences({
  formData, onInputChange, tracks, coverArtPreview,
  storeSelections, onStoreSelectionsChange,
  freeTrackIds, onFreeTrackIdsChange,
  audioClips, onAudioClipsChange,
  onNext, onPrev
}: StepDistributionPreferencesProps) {

  useEffect(() => {
    if (Object.keys(storeSelections).length === 0) {
      onStoreSelectionsChange(initStores());
    }
  }, []);

  const toggleStore = (name: string) => {
    onStoreSelectionsChange({
      ...storeSelections,
      [name]: { ...storeSelections[name], enabled: !storeSelections[name]?.enabled }
    });
  };

  const toggleFreeTrack = (trackIndex: number) => {
    const id = String(trackIndex);
    if (freeTrackIds.includes(id)) {
      onFreeTrackIdsChange(freeTrackIds.filter(i => i !== id));
    } else if (freeTrackIds.length < 3) {
      onFreeTrackIdsChange([...freeTrackIds, id]);
    }
  };

  const updateClip = (trackIndex: number, field: 'clip_start' | 'clip_end', value: number) => {
    const key = String(trackIndex);
    const existing = audioClips[key] || { clip_start: 0, clip_end: 30 };
    onAudioClipsChange({ ...audioClips, [key]: { ...existing, [field]: value } });
  };

  // Release date validation
  const releaseDateObj = formData.release_date ? new Date(formData.release_date) : null;
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 21);
  const isDateValid = releaseDateObj ? releaseDateObj >= minDate : false;

  const renderStoreGroup = (title: string, stores: string[], icon: React.ReactNode) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stores.map(name => {
          const store = storeSelections[name] || { name, enabled: true, status: 'pending' };
          return (
            <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{name}</span>
                <StatusBadge status={store.status} />
              </div>
              <Switch checked={store.enabled} onCheckedChange={() => toggleStore(name)} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with release info */}
      <div className="flex items-start gap-4">
        {coverArtPreview && (
          <img src={coverArtPreview} alt="Cover" className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border object-cover shrink-0" />
        )}
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold truncate">{formData.title || 'Untitled Release'}</h2>
          <p className="text-sm text-muted-foreground">Distribution Preferences</p>
        </div>
      </div>

      {/* Territory Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Territory Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={formData.territory || 'World'} onValueChange={(v) => onInputChange('territory', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TERRITORIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Release Date Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Release Date Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Release Date *</Label>
              <Input type="date" value={formData.release_date} onChange={(e) => onInputChange('release_date', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Release Time (optional)</Label>
              <Input type="time" value={formData.release_time || ''} onChange={(e) => onInputChange('release_time', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Timezone (optional)</Label>
              <Select value={formData.release_timezone || ''} onValueChange={(v) => onInputChange('release_timezone', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isDateValid && formData.release_date && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                You should set the release date at least 21 days in the future to allow time for promotion, pre-save campaigns and playlist pitching.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Apple Music and iTunes do not allow timed releases. Your release will go live at 12AM in each territory.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pre-order Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Pre-order Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Pre-order</Label>
            <Switch checked={formData.pre_order_enabled || false} onCheckedChange={(c) => onInputChange('pre_order_enabled', c)} />
          </div>
          {formData.pre_order_enabled && (
            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-2">
                <input type="radio" id="previews_yes" name="preorder_previews" checked={formData.pre_order_previews === true} onChange={() => onInputChange('pre_order_previews', true)} className="accent-primary" />
                <Label htmlFor="previews_yes" className="text-sm cursor-pointer">Allow previews during pre-order</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" id="previews_no" name="preorder_previews" checked={formData.pre_order_previews === false} onChange={() => onInputChange('pre_order_previews', false)} className="accent-primary" />
                <Label htmlFor="previews_no" className="text-sm cursor-pointer">No previews during pre-order</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={formData.pricing || 'standard'} onValueChange={(v) => onInputChange('pricing', v)}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="standard">Standard Pricing</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Audio Short Clip Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Scissors className="w-4 h-4" /> Audio Clip Generator</CardTitle>
          <p className="text-xs text-muted-foreground">Select 30-second clip range for ringtones. TikTok receives 60s automatically.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {tracks.map((track, i) => {
            const clip = audioClips[String(i)] || { clip_start: 0, clip_end: 30 };
            const maxDuration = track.duration || 240;
            return (
              <div key={i} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{track.title || `Track ${i + 1}`}</span>
                </div>
                <div className="bg-muted/50 rounded-full h-2 relative">
                  <div
                    className="absolute h-full bg-primary/60 rounded-full"
                    style={{
                      left: `${(clip.clip_start / maxDuration) * 100}%`,
                      width: `${((clip.clip_end - clip.clip_start) / maxDuration) * 100}%`
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start (seconds)</Label>
                    <Input type="number" min={0} max={maxDuration - 30} value={clip.clip_start} onChange={(e) => {
                      const start = Math.max(0, parseInt(e.target.value) || 0);
                      updateClip(i, 'clip_start', start);
                      if (clip.clip_end - start < 30) updateClip(i, 'clip_end', start + 30);
                    }} />
                  </div>
                  <div>
                    <Label className="text-xs">End (seconds)</Label>
                    <Input type="number" min={clip.clip_start + 30} max={maxDuration} value={clip.clip_end} onChange={(e) => updateClip(i, 'clip_end', Math.max(clip.clip_start + 30, parseInt(e.target.value) || 30))} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Free Track Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Free Track Downloads</CardTitle>
          <p className="text-xs text-muted-foreground">Select up to 3 tracks as free downloads on MALPINOHDISTRO ({freeTrackIds.length}/3)</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {tracks.map((track, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Checkbox
                checked={freeTrackIds.includes(String(i))}
                onCheckedChange={() => toggleFreeTrack(i)}
                disabled={!freeTrackIds.includes(String(i)) && freeTrackIds.length >= 3}
              />
              <span className="text-sm">{track.title || `Track ${i + 1}`}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Store Distribution */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Store className="w-4 h-4" /> Store Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderStoreGroup('Essential Stores', ESSENTIAL_STORES, <Store className="w-4 h-4" />)}
          {renderStoreGroup('Other Stores', OTHER_STORES, <Store className="w-4 h-4" />)}
          {renderStoreGroup('Neighbouring Rights', NEIGHBOURING_RIGHTS, <Music className="w-4 h-4" />)}
          {renderStoreGroup('Ringtone Stores', RINGTONE_STORES, <Music className="w-4 h-4" />)}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button type="button" onClick={onNext}>Preview & Distribute <ChevronRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}
