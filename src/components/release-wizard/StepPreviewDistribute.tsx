import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Send, Music, MapPin, Calendar, Store, Clock, DollarSign, Disc } from 'lucide-react';
import { TermsAndConditions } from '@/components/TermsAndConditions';
import { getStoreIcon } from '@/components/release/StoreIcons';

interface StepPreviewDistributeProps {
  formData: any;
  tracks: any[];
  coverArtPreview: string | null;
  storeSelections: Record<string, { name: string; enabled: boolean; status: 'pending' | 'incomplete' | 'delivered' }>;
  termsAccepted: boolean;
  onTermsAcceptedChange: (v: boolean) => void;
  isSubmitting: boolean;
  uploadProgress: any;
  onPrev: () => void;
  onSubmit: () => void;
}

export function StepPreviewDistribute({
  formData, tracks, coverArtPreview, storeSelections,
  termsAccepted, onTermsAcceptedChange,
  isSubmitting, uploadProgress,
  onPrev, onSubmit
}: StepPreviewDistributeProps) {
  const enabledStores = Object.values(storeSelections).filter(s => s.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1">Preview & Submit</h2>
        <p className="text-sm text-muted-foreground">Review your release before submission</p>
      </div>

      {/* Release Summary */}
      <Card className="overflow-hidden">
        <div className="bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {coverArtPreview && (
              <img src={coverArtPreview} alt="Cover" className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border shadow-md object-cover shrink-0 mx-auto sm:mx-0" />
            )}
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold truncate">{formData.title}</h3>
                <p className="text-sm text-muted-foreground">{formData.artist_name || 'Artist'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{formData.release_type || 'single'}</Badge>
                {formData.genre && <Badge variant="outline">{formData.genre}</Badge>}
                {formData.explicit_content && <Badge variant="destructive">Explicit</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{formData.release_date || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{formData.territory || 'World'}</span>
                </div>
                {formData.release_time && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{formData.release_time} {formData.release_timezone || ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span className="capitalize">{formData.pricing || 'Standard'} Pricing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tracklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Disc className="w-4 h-4" /> Tracklist ({tracks.length} {tracks.length === 1 ? 'track' : 'tracks'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {tracks.map((track, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="text-xs text-muted-foreground w-6 text-right font-mono">{track.track_number || i + 1}</span>
                <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{track.title || `Track ${i + 1}`}</span>
                {track.isrc && <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{track.isrc}</span>}
                {track.explicit_content && <Badge variant="destructive" className="text-[10px]">E</Badge>}
                {track.duration && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Stores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="w-4 h-4" /> Distribution ({enabledStores.length} stores)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {enabledStores.map(store => (
              <div key={store.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                {getStoreIcon(store.name)}
                <span className="text-xs font-medium truncate">{store.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TermsAndConditions />
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => onTermsAcceptedChange(c as boolean)} />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="terms" className="text-sm cursor-pointer">I have read and agree to the Terms & Conditions *</Label>
              <p className="text-xs text-muted-foreground">By submitting, you confirm full rights to distribute this content.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {isSubmitting && uploadProgress.step !== 'idle' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {uploadProgress.step === 'cover' && 'Uploading cover art...'}
                  {uploadProgress.step === 'audio' && `Uploading audio ${uploadProgress.currentIndex}/${uploadProgress.totalFiles}: ${uploadProgress.currentFile}`}
                  {uploadProgress.step === 'saving' && 'Saving release information...'}
                  {uploadProgress.step === 'stores' && 'Saving store selections...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev} disabled={isSubmitting}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting || !termsAccepted} className="gap-2">
          {isSubmitting ? 'Submitting...' : 'Submit Release'}
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
