import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Track {
  id?: string;
  track_number: number;
  title: string;
  duration?: number;
  isrc?: string;
  explicit_content: boolean;
  featured_artists: string[];
}

interface TracklistManagerProps {
  releaseType: 'single' | 'ep' | 'album';
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
  disabled?: boolean;
}

export function TracklistManager({ releaseType, tracks, onTracksChange, disabled = false }: TracklistManagerProps) {
  const [localTracks, setLocalTracks] = useState<Track[]>(tracks);

  useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  useEffect(() => {
    onTracksChange(localTracks);
  }, [localTracks, onTracksChange]);

  const getMaxTracks = () => {
    switch (releaseType) {
      case 'single': return 3;
      case 'ep': return 6;
      case 'album': return 50;
      default: return 1;
    }
  };

  const addTrack = () => {
    const maxTracks = getMaxTracks();
    if (localTracks.length >= maxTracks) {
      toast({
        title: "Maximum tracks reached",
        description: `A ${releaseType} can have at most ${maxTracks} tracks`,
        variant: "destructive"
      });
      return;
    }

    const newTrack: Track = {
      track_number: localTracks.length + 1,
      title: '',
      explicit_content: false,
      featured_artists: []
    };

    setLocalTracks([...localTracks, newTrack]);
  };

  const removeTrack = (index: number) => {
    if (localTracks.length <= 1) {
      toast({
        title: "Cannot remove track",
        description: "A release must have at least one track",
        variant: "destructive"
      });
      return;
    }

    const updatedTracks = localTracks.filter((_, i) => i !== index);
    // Renumber tracks
    const renumberedTracks = updatedTracks.map((track, i) => ({
      ...track,
      track_number: i + 1
    }));
    setLocalTracks(renumberedTracks);
  };

  const updateTrack = (index: number, field: keyof Track, value: any) => {
    const updatedTracks = [...localTracks];
    
    if (field === 'featured_artists' && typeof value === 'string') {
      // Handle featured artists as comma-separated string
      updatedTracks[index] = {
        ...updatedTracks[index],
        [field]: value.split(',').map(artist => artist.trim()).filter(artist => artist)
      };
    } else if (field === 'duration' && typeof value === 'string') {
      // Convert MM:SS to seconds
      const [minutes, seconds] = value.split(':').map(Number);
      updatedTracks[index] = {
        ...updatedTracks[index],
        [field]: isNaN(minutes) || isNaN(seconds) ? undefined : (minutes * 60) + seconds
      };
    } else {
      updatedTracks[index] = {
        ...updatedTracks[index],
        [field]: value
      };
    }
    
    setLocalTracks(updatedTracks);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const moveTrack = (fromIndex: number, toIndex: number) => {
    const updatedTracks = [...localTracks];
    const [movedTrack] = updatedTracks.splice(fromIndex, 1);
    updatedTracks.splice(toIndex, 0, movedTrack);
    
    // Renumber tracks
    const renumberedTracks = updatedTracks.map((track, i) => ({
      ...track,
      track_number: i + 1
    }));
    setLocalTracks(renumberedTracks);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Tracklist ({localTracks.length}/{getMaxTracks()})
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTrack}
            disabled={disabled || localTracks.length >= getMaxTracks()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {localTracks.map((track, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <span className="font-medium">Track {track.track_number}</span>
              </div>
              {localTracks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTrack(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`track-title-${index}`}>Track Title *</Label>
                <Input
                  id={`track-title-${index}`}
                  value={track.title}
                  onChange={(e) => updateTrack(index, 'title', e.target.value)}
                  placeholder="Track title"
                  disabled={disabled}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`track-duration-${index}`}>Duration (MM:SS)</Label>
                <Input
                  id={`track-duration-${index}`}
                  value={formatDuration(track.duration)}
                  onChange={(e) => updateTrack(index, 'duration', e.target.value)}
                  placeholder="3:45"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor={`track-isrc-${index}`}>ISRC (Optional)</Label>
                <Input
                  id={`track-isrc-${index}`}
                  value={track.isrc || ''}
                  onChange={(e) => updateTrack(index, 'isrc', e.target.value)}
                  placeholder="USRC17607839"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor={`track-featured-${index}`}>Featured Artists</Label>
                <Input
                  id={`track-featured-${index}`}
                  value={track.featured_artists.join(', ')}
                  onChange={(e) => updateTrack(index, 'featured_artists', e.target.value)}
                  placeholder="Artist 1, Artist 2"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`track-explicit-${index}`}
                checked={track.explicit_content}
                onCheckedChange={(checked) => updateTrack(index, 'explicit_content', checked)}
                disabled={disabled}
              />
              <Label htmlFor={`track-explicit-${index}`}>Explicit Content</Label>
            </div>
          </div>
        ))}

        {localTracks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tracks added yet. Click "Add Track" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}