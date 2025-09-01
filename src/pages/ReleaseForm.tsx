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
  DollarSign
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { TracklistManager } from '../components/TracklistManager';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { submitRelease } from '../services/releaseService';

// Mock platforms data
const distributionPlatforms = [
  { id: 'spotify', name: 'Spotify', logo: 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png' },
  { id: 'apple', name: 'Apple Music', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Apple_Music_icon.svg/2048px-Apple_Music_icon.svg.png' },
  { id: 'audiomack', name: 'Audiomack', logo: 'https://audiomack.com/static-assets/branding/audiomack-logo.png' },
  { id: 'boomplay', name: 'Boomplay', logo: 'https://www.boomplaymusic.com/static/web/logo.png' },
  { id: 'youtube', name: 'YouTube Music', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Youtube_Music_icon.svg/2048px-Youtube_Music_icon.svg.png' },
  { id: 'deezer', name: 'Deezer', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Deezer_logo.svg/1280px-Deezer_logo.svg.png' }
];

// Genres
const genres = [
  'Afrobeats', 'Highlife', 'Afro-Pop', 'Gospel', 'Hip-Hop', 'R&B', 'Amapiano',
  'Traditional', 'Reggae/Dancehall', 'Alternative', 'Electronic', 'Jazz', 'Folk'
];

const ReleaseForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Form state
  const [formState, setFormState] = useState({
    title: '',
    artist: '',
    featuring: '',
    releaseDate: '',
    genres: [],
    platforms: [],
    explicitContent: false,
    upc: '',
    recordLabel: '',
    language: 'English',
    primaryArtist: '',
    composer: '',
    publisher: '',
    notes: ''
  });
  
  // File state
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverArtPreview, setCoverArtPreview] = useState<string | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [audioTitles, setAudioTitles] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for file inputs
  const coverArtInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Check authentication on component mount
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
  }, [navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormState(prev => ({ ...prev, [name]: checked }));
  };

  const handlePlatformToggle = (platformId: string) => {
    setFormState(prev => {
      const platforms = [...prev.platforms];
      if (platforms.includes(platformId)) {
        return { ...prev, platforms: platforms.filter(id => id !== platformId) };
      } else {
        return { ...prev, platforms: [...platforms, platformId] };
      }
    });
  };

  const handleGenreToggle = (genre: string) => {
    setFormState(prev => {
      const genres = [...prev.genres];
      if (genres.includes(genre)) {
        return { ...prev, genres: genres.filter(g => g !== genre) };
      } else {
        return { ...prev, genres: [...genres, genre] };
      }
    });
  };

  const handleCoverArtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverArt(file);
      
      // Create preview URL
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
      
      // Extract initial titles from filenames without extension
      const newTitles = newFiles.map(file => {
        const fileName = file.name;
        return fileName.substring(0, fileName.lastIndexOf('.'));
      });
      
      setAudioTitles(prev => [...prev, ...newTitles]);
    }
  };

  const handleRemoveAudio = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
    setAudioTitles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAudioTitleChange = (index: number, newTitle: string) => {
    setAudioTitles(prev => {
      const updated = [...prev];
      updated[index] = newTitle;
      return updated;
    });
  };

  const handleRemoveCoverArt = () => {
    setCoverArt(null);
    setCoverArtPreview(null);
    if (coverArtInputRef.current) {
      coverArtInputRef.current.value = '';
    }
  };

  const nextStep = () => {
    window.scrollTo(0, 0);
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    window.scrollTo(0, 0);
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Check if user is authenticated
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
      
      const userId = session.user.id;
      
      // Submit the release
      const result = await submitRelease(formState, userId, coverArt, audioFiles);
      
      if (result.success) {
        toast({
          title: "Release submitted",
          description: "Your release has been submitted for review",
          variant: "default"
        });
        
        // Navigate to success step
        nextStep();
      } else {
        throw new Error("Failed to submit release");
      }
    } catch (error) {
      console.error('Error submitting release:', error);
      toast({
        title: "Submission failed",
        description: "An error occurred while submitting your release",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-6">Release Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="title" className="label">Release Title*</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formState.title}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter the title of your release"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="artist" className="label">Artist Name*</label>
                <input
                  id="artist"
                  name="artist"
                  type="text"
                  value={formState.artist}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Your artist name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="featuring" className="label">Featuring Artists</label>
                <input
                  id="featuring"
                  name="featuring"
                  type="text"
                  value={formState.featuring}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter featured artists (comma separated)"
                />
              </div>
              
              <div>
                <label htmlFor="releaseDate" className="label">Release Date*</label>
                <div className="relative">
                  <input
                    id="releaseDate"
                    name="releaseDate"
                    type="date"
                    value={formState.releaseDate}
                    onChange={handleInputChange}
                    className="input-field pr-10"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Allow at least 2 weeks for processing</p>
              </div>
            </div>
            
            <div className="mb-8">
              <label className="label">Genres* (Select up to 3)</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formState.genres.includes(genre)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={formState.genres.length >= 3 && !formState.genres.includes(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              {formState.genres.length > 0 && (
                <p className="text-sm text-slate-500 mt-2">
                  Selected: {formState.genres.join(', ')}
                </p>
              )}
            </div>
            
            <div className="mb-8">
              <label className="label">Distribution Platforms* (Select at least one)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {distributionPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                      formState.platforms.includes(platform.id)
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                      <img 
                        src={platform.logo} 
                        alt={platform.name}
                        className="max-w-full max-h-full object-contain"
                      />
                      {formState.platforms.includes(platform.id) && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-center text-slate-700">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center mb-8">
              <input
                id="explicitContent"
                name="explicitContent"
                type="checkbox"
                checked={formState.explicitContent}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="explicitContent" className="ml-2 text-sm font-medium text-slate-700">
                This release contains explicit content
              </label>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                disabled={!formState.title || !formState.artist || !formState.releaseDate || formState.genres.length === 0 || formState.platforms.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                Continue to Upload Files
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-6">Upload Files</h2>
            
            <div className="mb-8">
              <label className="label">Cover Art* (Square image, minimum 3000x3000px)</label>
              <div className="mt-2">
                {!coverArtPreview ? (
                  <div 
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => coverArtInputRef.current?.click()}
                  >
                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-slate-500" />
                    </div>
                    <h3 className="text-slate-700 font-medium">Upload Cover Art</h3>
                    <p className="text-sm text-slate-500 mt-1">Click to browse or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-3">Accepted formats: JPG, PNG - Max size: 15MB</p>
                    
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
                      className="w-full max-w-xs h-auto object-contain rounded-lg border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCoverArt}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-slate-600 mt-2">{coverArt?.name}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-8">
              <label className="label">Audio Files* (WAV format recommended, 16 bit, 44.1kHz)</label>
              <div 
                className="mt-2 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => audioInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Music className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-slate-700 font-medium">Upload Audio Files</h3>
                <p className="text-sm text-slate-500 mt-1">Click to browse or drag and drop</p>
                <p className="text-xs text-slate-400 mt-3">Accepted formats: WAV, MP3, FLAC - Max size: 50MB per file</p>
                
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
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-3">Uploaded Tracks ({audioFiles.length})</h3>
                  <ul className="space-y-4">
                    {audioFiles.map((file, index) => (
                      <li key={index} className="glass-card p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Music className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="flex-grow">
                              <input
                                type="text"
                                value={audioTitles[index]}
                                onChange={(e) => handleAudioTitleChange(index, e.target.value)}
                                className="input-field"
                                placeholder="Track title"
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                {(file.size / (1024 * 1024)).toFixed(2)}MB - {file.type}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAudio(index)}
                            className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-sm">Remove</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary flex items-center gap-2"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
                Back
              </button>
              
              <button
                type="button"
                onClick={nextStep}
                disabled={!coverArt || audioFiles.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                Continue to Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-6">Additional Details & Payment</h2>
            
            {/* Payment Information */}
            <div className="glass-panel p-6 mb-8 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-green-800 font-medium">Payment Instructions</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Please make a payment via bank transfer to the following account:
                  </p>
                  <div className="mt-3 p-4 bg-white rounded-md border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">Account Name:</span> 
                        <span className="ml-2">ABDULKADIR IBRAHIM OLUWASHINA</span>
                      </div>
                      <div>
                        <span className="font-semibold">Account Number:</span> 
                        <span className="ml-2">8168940582</span>
                      </div>
                      <div>
                        <span className="font-semibold">Bank:</span> 
                        <span className="ml-2">OPAY DIGITAL BANK</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-green-700">
                      Please include your artist name as reference when making the payment. Your submission will be processed after payment confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-6 mb-8">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-slate-900 font-medium">Why these details matter</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    This information helps ensure accurate attribution and royalty payments.
                    The more complete your metadata, the better your release will be managed
                    across all platforms.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="upc" className="label">UPC (Universal Product Code)</label>
                <input
                  id="upc"
                  name="upc"
                  type="text"
                  value={formState.upc}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Leave blank if you don't have one"
                />
                <p className="text-xs text-slate-500 mt-1">We'll assign one if left blank</p>
              </div>
              
              <div>
                <label htmlFor="recordLabel" className="label">Record Label</label>
                <input
                  id="recordLabel"
                  name="recordLabel"
                  type="text"
                  value={formState.recordLabel}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your label name (if applicable)"
                />
              </div>
              
              <div>
                <label htmlFor="language" className="label">Primary Language*</label>
                <select
                  id="language"
                  name="language"
                  value={formState.language}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="English">English</option>
                  <option value="Yoruba">Yoruba</option>
                  <option value="Igbo">Igbo</option>
                  <option value="Hausa">Hausa</option>
                  <option value="Pidgin">Pidgin</option>
                  <option value="French">French</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="primaryArtist" className="label">Primary Artist*</label>
                <input
                  id="primaryArtist"
                  name="primaryArtist"
                  type="text"
                  value={formState.primaryArtist || formState.artist}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Legal name of main artist</p>
              </div>
              
              <div>
                <label htmlFor="composer" className="label">Composer/Writer*</label>
                <input
                  id="composer"
                  name="composer"
                  type="text"
                  value={formState.composer}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Who wrote the songs"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="publisher" className="label">Publisher</label>
                <input
                  id="publisher"
                  name="publisher"
                  type="text"
                  value={formState.publisher}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Leave blank if not published"
                />
              </div>
            </div>
            
            <div className="mb-8">
              <label htmlFor="notes" className="label">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formState.notes}
                onChange={handleInputChange}
                className="input-field min-h-[120px]"
                placeholder="Any special instructions or information for your release"
              />
            </div>
            
            <div className="glass-panel p-6 mb-8 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-amber-800 font-medium">Before you submit</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Please verify that you own or have proper licenses for all content.
                    Submissions with copyright issues may be rejected.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary flex items-center gap-2"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
                Back
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Release
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="animate-fade-in text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-display font-semibold text-slate-900 mb-4">
              Your Release Has Been Submitted!
            </h2>
            
            <p className="text-lg text-slate-600 max-w-lg mx-auto mb-8">
              We'll review your submission and get back to you soon. You can check the status in your dashboard.
            </p>
            
            <div className="glass-panel p-6 mb-8 max-w-lg mx-auto">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Payment Instructions</h3>
              <p className="text-slate-600 mb-4">
                Please make your payment to complete your release submission:
              </p>
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Account Name:</span> 
                    <span className="ml-2 text-slate-700">ABDULKADIR IBRAHIM OLUWASHINA</span>
                  </div>
                  <div>
                    <span className="font-semibold">Account Number:</span> 
                    <span className="ml-2 text-slate-700">8168940582</span>
                  </div>
                  <div>
                    <span className="font-semibold">Bank:</span> 
                    <span className="ml-2 text-slate-700">OPAY DIGITAL BANK</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Include your artist name in the payment reference to help us match your payment to your submission.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link to="/dashboard" className="btn-primary px-8">
                Return to Dashboard
              </Link>
              
              <Link to="/releases" className="btn-secondary px-8">
                View Your Releases
              </Link>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="max-w-4xl mx-auto">
              {currentStep < 4 && (
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Submit New Release</h1>
                  <p className="text-slate-600">Complete the form below to submit your music for distribution.</p>
                </div>
              )}
              
              {currentStep < 4 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between w-full max-w-lg mx-auto">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ${
                          currentStep >= step
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {step}
                        </div>
                        <span className="text-xs text-slate-600 mt-2">
                          {step === 1 ? 'Information' : step === 2 ? 'Files' : 'Details & Payment'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-1 max-w-lg mx-auto mt-4 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="glass-panel p-8">
                <form onSubmit={handleSubmit}>
                  {renderStepContent()}
                </form>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReleaseForm;
