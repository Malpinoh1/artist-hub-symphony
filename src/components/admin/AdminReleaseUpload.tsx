import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Check, Music, Disc, Album, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAllArtists, adminCreateRelease, Artist } from '@/services/admin/releaseService';
import { supabase } from '@/integrations/supabase/client';

const releaseTypes = [
  { id: 'single', name: 'Single', icon: <Music className="w-4 h-4" />, description: 'Up to 3 tracks' },
  { id: 'ep', name: 'EP', icon: <Disc className="w-4 h-4" />, description: '4-6 tracks' },
  { id: 'album', name: 'Album', icon: <Album className="w-4 h-4" />, description: '7+ tracks' }
];

const genres = [
  'Afrobeats', 'Highlife', 'Afro-Pop', 'Gospel', 'Hip-Hop', 'R&B', 'Amapiano',
  'Traditional', 'Reggae/Dancehall', 'Alternative', 'Electronic', 'Jazz', 'Folk',
  'Pop', 'Rock', 'Country', 'Classical', 'Blues', 'Funk', 'Soul'
];

const distributionPlatforms = [
  { id: 'spotify', name: 'Spotify' },
  { id: 'apple', name: 'Apple Music' },
  { id: 'youtube', name: 'YouTube Music' },
  { id: 'audiomack', name: 'Audiomack' },
  { id: 'boomplay', name: 'Boomplay' },
  { id: 'deezer', name: 'Deezer' },
  { id: 'tidal', name: 'Tidal' },
  { id: 'amazon', name: 'Amazon Music' }
];

interface AdminReleaseUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AdminReleaseUpload: React.FC<AdminReleaseUploadProps> = ({ open, onOpenChange, onSuccess }) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  const coverArtInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    release_type: 'single',
    genre: '',
    description: '',
    release_date: '',
    primary_language: 'English',
    explicit_content: false,
    producer_credits: '',
    songwriter_credits: '',
    artwork_credits: '',
    copyright_info: '',
  });
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      loadArtists();
    }
  }, [open]);

  const loadArtists = async () => {
    setLoadingArtists(true);
    try {
      const data = await fetchAllArtists();
      setArtists(data);
    } catch (error) {
      console.error('Error loading artists:', error);
      toast.error('Failed to load artists');
    } finally {
      setLoadingArtists(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleCoverArtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverArt(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverArtPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const removeCoverArt = () => {
    setCoverArt(null);
    setCoverArtPreview(null);
    if (coverArtInputRef.current) coverArtInputRef.current.value = '';
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const resetForm = () => {
    setSelectedArtistId('');
    setFormData({
      title: '',
      release_type: 'single',
      genre: '',
      description: '',
      release_date: '',
      primary_language: 'English',
      explicit_content: false,
      producer_credits: '',
      songwriter_credits: '',
      artwork_credits: '',
      copyright_info: '',
    });
    setSelectedPlatforms([]);
    setCoverArt(null);
    setCoverArtPreview(null);
    setAudioFile(null);
    setUploadProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedArtistId) {
      toast.error('Please select an artist');
      return;
    }
    
    if (!formData.title || !formData.release_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one distribution platform');
      return;
    }
    
    setSubmitting(true);
    
    try {
      let coverArtUrl = null;
      let audioFileUrl = null;
      
      // Upload cover art if provided
      if (coverArt) {
        setUploadProgress('Uploading cover art...');
        const coverArtFileName = `${Date.now()}_cover.${coverArt.name.split('.').pop()}`;
        const coverArtPath = `${selectedArtistId}/${coverArtFileName}`;
        
        const { error: coverUploadError } = await supabase.storage
          .from('release_artwork')
          .upload(coverArtPath, coverArt, { cacheControl: '3600', upsert: false });
          
        if (coverUploadError) throw new Error(`Failed to upload cover art: ${coverUploadError.message}`);
        
        const { data: publicUrlData } = supabase.storage
          .from('release_artwork')
          .getPublicUrl(coverArtPath);
        coverArtUrl = publicUrlData?.publicUrl;
      }
      
      // Upload audio file if provided
      if (audioFile) {
        setUploadProgress('Uploading audio file...');
        const audioFileName = `${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const audioPath = `${selectedArtistId}/${audioFileName}`;
        
        const { error: audioUploadError } = await supabase.storage
          .from('audio_files')
          .upload(audioPath, audioFile, { cacheControl: '3600', upsert: false });
          
        if (audioUploadError) throw new Error(`Failed to upload audio: ${audioUploadError.message}`);
        
        const { data: audioUrlData } = supabase.storage
          .from('audio_files')
          .getPublicUrl(audioPath);
        audioFileUrl = audioUrlData?.publicUrl;
      }
      
      setUploadProgress('Creating release...');
      
      const result = await adminCreateRelease(
        selectedArtistId,
        {
          ...formData,
          platforms: selectedPlatforms,
        },
        coverArtUrl,
        audioFileUrl
      );
      
      if (result.success) {
        toast.success('Release created successfully! Artist has been notified.');
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        throw new Error(result.error?.message || 'Failed to create release');
      }
    } catch (error: any) {
      console.error('Error creating release:', error);
      toast.error(error.message || 'Failed to create release');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Release for Artist</DialogTitle>
          <DialogDescription>
            Create a new release on behalf of an artist. They will be notified via email.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Artist Selection */}
          <div>
            <Label>Select Artist *</Label>
            <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingArtists ? "Loading artists..." : "Select an artist"} />
              </SelectTrigger>
              <SelectContent>
                {artists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.name} ({artist.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Release Type Selection */}
          <div>
            <Label className="mb-2 block">Release Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              {releaseTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    formData.release_type === type.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-muted-foreground'
                  }`}
                  onClick={() => handleInputChange('release_type', type.id)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {type.icon}
                      <span className="text-sm font-medium">{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Release title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select value={formData.genre} onValueChange={(value) => handleInputChange('genre', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="release_date">Release Date *</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => handleInputChange('release_date', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="primary_language">Language</Label>
              <Select value={formData.primary_language} onValueChange={(value) => handleInputChange('primary_language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Yoruba">Yoruba</SelectItem>
                  <SelectItem value="Igbo">Igbo</SelectItem>
                  <SelectItem value="Hausa">Hausa</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          
          {/* Platform Selection */}
          <div>
            <Label className="mb-2 block">Distribution Platforms *</Label>
            <div className="grid grid-cols-4 gap-2">
              {distributionPlatforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlatforms.includes(platform.id)
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-muted-foreground'
                  }`}
                  onClick={() => handlePlatformToggle(platform.id)}
                >
                  <CardContent className="p-2 text-center">
                    <span className="text-xs font-medium">{platform.name}</span>
                    {selectedPlatforms.includes(platform.id) && (
                      <Check className="w-3 h-3 mx-auto mt-1 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* File Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cover Art</Label>
              <div className="mt-1">
                {coverArtPreview ? (
                  <div className="relative w-32 h-32">
                    <img src={coverArtPreview} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeCoverArt}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => coverArtInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Cover
                  </Button>
                )}
                <input
                  ref={coverArtInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverArtChange}
                  className="hidden"
                />
              </div>
            </div>
            
            <div>
              <Label>Audio File</Label>
              <div className="mt-1">
                {audioFile ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-sm truncate flex-1">{audioFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={removeAudioFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => audioInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Audio
                  </Button>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          
          {/* Explicit Content Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.explicit_content}
              onCheckedChange={(checked) => handleInputChange('explicit_content', checked)}
            />
            <Label>Contains explicit content</Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedArtistId}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadProgress || 'Creating...'}
                </>
              ) : (
                'Create Release'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminReleaseUpload;