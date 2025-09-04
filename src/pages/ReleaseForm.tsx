import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  X, 
  Calendar, 
  AlertCircle, 
  Check, 
  Music, 
  Info,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Album,
  Disc,
  Music2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { TracklistManager } from '../components/TracklistManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const releaseTypes = [
  { 
    id: 'single', 
    name: 'Single', 
    icon: <Music className="w-5 h-5" />,
    description: 'Up to 3 tracks',
    maxTracks: 3
  },
  { 
    id: 'ep', 
    name: 'EP', 
    icon: <Disc className="w-5 h-5" />,
    description: '4-6 tracks',
    maxTracks: 6
  },
  { 
    id: 'album', 
    name: 'Album', 
    icon: <Album className="w-5 h-5" />,
    description: '7+ tracks',
    maxTracks: 50
  }
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

const ReleaseForm = () => {
  const navigate = useNavigate();
  const coverArtInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    release_type: 'single',
    genre: '',
    description: '',
    release_date: '',
    artwork_credits: '',
    producer_credits: '',
    songwriter_credits: '',
    primary_language: 'English',
    explicit_content: false,
    copyright_info: '',
    submission_notes: '',
    upc: '',
    total_tracks: 1
  });

  const [tracks, setTracks] = useState([
    {
      track_number: 1,
      title: '',
      explicit_content: false,
      featured_artists: []
    }
  ]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to submit releases",
          variant: "destructive"
        });
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  // Update total tracks when release type changes
  useEffect(() => {
    const releaseType = releaseTypes.find(rt => rt.id === formData.release_type);
    if (releaseType) {
      setFormData(prev => ({ ...prev, total_tracks: tracks.length }));
    }
  }, [formData.release_type, tracks.length]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReleaseTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, release_type: type }));
    
    // Reset tracks if switching to single and have more than 1 track
    if (type === 'single' && tracks.length > 1) {
      setTracks([tracks[0]]);
    }
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
      reader.onloadend = () => {
        setCoverArtPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAudioFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeCoverArt = () => {
    setCoverArt(null);
    setCoverArtPreview(null);
    if (coverArtInputRef.current) {
      coverArtInputRef.current.value = '';
    }
  };

  const removeAudioFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to submit a release",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      // Upload cover art
      let coverArtUrl = null;
      if (coverArt) {
        const fileExt = coverArt.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('release_artwork')
          .upload(fileName, coverArt);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('release_artwork')
          .getPublicUrl(fileName);
        
        coverArtUrl = publicUrl;
      }

      // Upload audio files
      const audioUrls: string[] = [];
      for (const file of audioFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio_files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('audio_files')
          .getPublicUrl(fileName);
        
        audioUrls.push(publicUrl);
      }

      // Prepare form data with proper structure
      const releaseFormData = {
        ...formData,
        platforms: selectedPlatforms
      };

      // Import the submitRelease function dynamically to use the updated version
      const { submitRelease } = await import('../services/releaseService');
      
      // Submit release with all data including tracks
      const result = await submitRelease(
        releaseFormData,
        session.user.id,
        coverArt,
        audioFiles,
        tracks
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit release');
      }

      toast({
        title: "Success!",
        description: "Your release has been submitted for review"
      });

      setCurrentStep(4); // Success step
    } catch (error) {
      console.error('Error submitting release:', error);
      toast({
        title: "Error",
        description: "Failed to submit release. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Release Type & Basic Info</h2>
              
              {/* Release Type Selection */}
              <div className="mb-6">
                <Label className="text-base font-medium mb-3 block">Release Type *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {releaseTypes.map((type) => (
                    <Card 
                      key={type.id}
                      className={`cursor-pointer transition-all ${
                        formData.release_type === type.id 
                          ? 'ring-2 ring-primary border-primary' 
                          : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => handleReleaseTypeChange(type.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          {type.icon}
                          <div>
                            <h3 className="font-medium">{type.name}</h3>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Release Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter release title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="genre">Genre *</Label>
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
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="primary_language">Primary Language</Label>
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
                      <SelectItem value="Spanish">Spanish</SelectItem>
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
                  placeholder="Brief description of your release"
                  rows={3}
                />
              </div>

              {/* Platform Selection */}
              <div>
                <Label className="text-base font-medium mb-3 block">Distribution Platforms * (Select at least one)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <CardContent className="p-3 text-center">
                        <p className="text-sm font-medium">{platform.name}</p>
                        {selectedPlatforms.includes(platform.id) && (
                          <Check className="w-4 h-4 mx-auto mt-1 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="explicit_content"
                  checked={formData.explicit_content}
                  onCheckedChange={(checked) => handleInputChange('explicit_content', checked)}
                />
                <Label htmlFor="explicit_content">Contains explicit content</Label>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!formData.title || !formData.genre || !formData.release_date || selectedPlatforms.length === 0}
                >
                  Continue to Tracks <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Tracklist</h2>
            
            <TracklistManager
              releaseType={formData.release_type as 'single' | 'ep' | 'album'}
              tracks={tracks}
              onTracksChange={setTracks}
            />

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                <ChevronDown className="w-4 h-4 mr-2 rotate-90" /> Back
              </Button>
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={tracks.length === 0 || tracks.some(track => !track.title.trim())}
              >
                Continue to Files <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Upload Files & Additional Details</h2>
            
            {/* Credits and Copyright */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="producer_credits">Producer Credits</Label>
                <Input
                  id="producer_credits"
                  value={formData.producer_credits}
                  onChange={(e) => handleInputChange('producer_credits', e.target.value)}
                  placeholder="Producer name(s)"
                />
              </div>

              <div>
                <Label htmlFor="songwriter_credits">Songwriter Credits</Label>
                <Input
                  id="songwriter_credits"
                  value={formData.songwriter_credits}
                  onChange={(e) => handleInputChange('songwriter_credits', e.target.value)}
                  placeholder="Songwriter name(s)"
                />
              </div>

              <div>
                <Label htmlFor="artwork_credits">Artwork Credits</Label>
                <Input
                  id="artwork_credits"
                  value={formData.artwork_credits}
                  onChange={(e) => handleInputChange('artwork_credits', e.target.value)}
                  placeholder="Artist/Designer name"
                />
              </div>

              <div>
                <Label htmlFor="copyright_info">Copyright Information</Label>
                <Input
                  id="copyright_info"
                  value={formData.copyright_info}
                  onChange={(e) => handleInputChange('copyright_info', e.target.value)}
                  placeholder="© 2025 Artist Name"
                />
              </div>

              <div>
                <Label htmlFor="upc">UPC/Barcode (Optional)</Label>
                <Input
                  id="upc"
                  value={formData.upc}
                  onChange={(e) => handleInputChange('upc', e.target.value)}
                  placeholder="Universal Product Code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="submission_notes">Additional Notes</Label>
              <Textarea
                id="submission_notes"
                value={formData.submission_notes}
                onChange={(e) => handleInputChange('submission_notes', e.target.value)}
                placeholder="Any additional information or special requirements"
                rows={3}
              />
            </div>

            {/* Cover Art Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Cover Art *</CardTitle>
                <p className="text-sm text-muted-foreground">Upload a high-quality image (minimum 3000x3000px, square format)</p>
              </CardHeader>
              <CardContent>
                {!coverArtPreview ? (
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => coverArtInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">Upload Cover Art</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click to browse or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Square image, minimum 3000x3000px - JPG/PNG - Max 15MB
                    </p>
                    <input
                      ref={coverArtInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleCoverArtChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={coverArtPreview}
                      alt="Cover Art Preview"
                      className="w-full max-w-xs mx-auto rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeCoverArt}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      {coverArt?.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audio Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Audio Files *</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Music className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Upload Audio Files</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to browse or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    WAV, MP3, FLAC - Max 50MB per file
                  </p>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/wav,audio/mpeg,audio/flac"
                    onChange={handleAudioChange}
                    multiple
                    className="hidden"
                  />
                </div>
                
                {audioFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Uploaded Files ({audioFiles.length})</h4>
                    {audioFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Music className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudioFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>


            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                <ChevronDown className="w-4 h-4 mr-2 rotate-90" /> Back
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !coverArt || audioFiles.length === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Release'} 
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-2">Release Submitted Successfully!</h2>
              <p className="text-muted-foreground">
                Your release has been submitted for review. We'll notify you once it's processed.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/releases">View Releases</Link>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="max-w-4xl mx-auto">
              {currentStep < 4 && (
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Submit New Release</h1>
                  <p className="text-muted-foreground">
                    Complete the form below to submit your music for distribution.
                  </p>
                </div>
              )}
              
              {currentStep < 4 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between w-full max-w-lg mx-auto">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ${
                          currentStep >= step
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {step}
                        </div>
                        <span className="text-xs text-muted-foreground mt-2">
                          {step === 1 ? 'Info' : step === 2 ? 'Tracks' : 'Files'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-1 max-w-lg mx-auto mt-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <Card>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit}>
                    {renderStepContent()}
                  </form>
                </CardContent>
              </Card>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReleaseForm;