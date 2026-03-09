import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Music, Disc, Album } from 'lucide-react';

interface ArtistAccount {
  id: string;
  artist_name: string;
  artist_email: string | null;
}

interface StepAlbumInfoProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  artistAccounts: ArtistAccount[];
  selectedArtistAccount: string;
  onArtistAccountChange: (value: string) => void;
  onNext: () => void;
}

const releaseTypes = [
  { id: 'single', name: 'Single', icon: <Music className="w-5 h-5" />, description: 'Up to 3 tracks', maxTracks: 3 },
  { id: 'ep', name: 'EP', icon: <Disc className="w-5 h-5" />, description: '4-6 tracks', maxTracks: 6 },
  { id: 'album', name: 'Album', icon: <Album className="w-5 h-5" />, description: '7+ tracks', maxTracks: 50 }
];

const genres = [
  'Afrobeats', 'Highlife', 'Afro-Pop', 'Gospel', 'Hip-Hop', 'R&B', 'Amapiano',
  'Traditional', 'Reggae/Dancehall', 'Alternative', 'Electronic', 'Jazz', 'Folk',
  'Pop', 'Rock', 'Country', 'Classical', 'Blues', 'Funk', 'Soul'
];

export function StepAlbumInfo({ formData, onInputChange, artistAccounts, selectedArtistAccount, onArtistAccountChange, onNext }: StepAlbumInfoProps) {
  const canProceed = formData.title && formData.genre && formData.release_date;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1">Album Info</h2>
        <p className="text-sm text-muted-foreground">Basic information about your release</p>
      </div>

      {artistAccounts.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Release As</Label>
          <Select value={selectedArtistAccount} onValueChange={onArtistAccountChange}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select artist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Myself (Primary Account)</SelectItem>
              {artistAccounts.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>{artist.artist_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-3 block">Release Type</Label>
        <div className="grid grid-cols-3 gap-3">
          {releaseTypes.map((type) => (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all ${
                formData.release_type === type.id ? 'ring-2 ring-primary border-primary' : 'hover:border-muted-foreground'
              }`}
              onClick={() => onInputChange('release_type', type.id)}
            >
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="flex flex-col items-center space-y-1">
                  {type.icon}
                  <h3 className="font-medium text-sm">{type.name}</h3>
                  <p className="text-xs text-muted-foreground hidden sm:block">{type.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Release Title *</Label>
          <Input id="title" value={formData.title} onChange={(e) => onInputChange('title', e.target.value)} placeholder="Enter release title" />
        </div>
        <div>
          <Label htmlFor="genre">Genre *</Label>
          <Select value={formData.genre} onValueChange={(v) => onInputChange('genre', v)}>
            <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
            <SelectContent>
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="release_date">Release Date *</Label>
          <Input id="release_date" type="date" value={formData.release_date} onChange={(e) => onInputChange('release_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        <div>
          <Label htmlFor="primary_language">Primary Language</Label>
          <Select value={formData.primary_language} onValueChange={(v) => onInputChange('primary_language', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['English', 'Yoruba', 'Igbo', 'Hausa', 'French', 'Spanish', 'Other'].map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => onInputChange('description', e.target.value)} placeholder="Brief description of your release" rows={3} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="explicit_content" checked={formData.explicit_content} onCheckedChange={(c) => onInputChange('explicit_content', c)} />
        <Label htmlFor="explicit_content">Contains explicit content</Label>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!canProceed}>
          Continue to Tracks <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
