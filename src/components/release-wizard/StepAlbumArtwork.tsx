import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Upload, X } from 'lucide-react';

interface StepAlbumArtworkProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  coverArt: File | null;
  coverArtPreview: string | null;
  onCoverArtChange: (file: File | null, preview: string | null) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepAlbumArtwork({ formData, onInputChange, coverArt, coverArtPreview, onCoverArtChange, onNext, onPrev }: StepAlbumArtworkProps) {
  const coverArtInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => onCoverArtChange(file, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1">Album Artwork</h2>
        <p className="text-sm text-muted-foreground">Upload cover art and add credits</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cover Art *</CardTitle>
          <p className="text-xs text-muted-foreground">Minimum 3000×3000px, square format, JPG/PNG</p>
        </CardHeader>
        <CardContent>
          {!coverArtPreview ? (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => coverArtInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-1 text-sm">Upload Cover Art</h3>
              <p className="text-xs text-muted-foreground">Click to browse — Max 15MB</p>
              <input ref={coverArtInputRef} type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="hidden" />
            </div>
          ) : (
            <div className="relative max-w-xs mx-auto">
              <img src={coverArtPreview} alt="Cover Art" className="w-full rounded-lg border" />
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => { onCoverArtChange(null, null); }}>
                <X className="w-4 h-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">{coverArt?.name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="artwork_credits">Artwork Credits</Label>
          <Input id="artwork_credits" value={formData.artwork_credits} onChange={(e) => onInputChange('artwork_credits', e.target.value)} placeholder="Artist/Designer name" />
        </div>
        <div>
          <Label htmlFor="producer_credits">Producer Credits</Label>
          <Input id="producer_credits" value={formData.producer_credits} onChange={(e) => onInputChange('producer_credits', e.target.value)} placeholder="Producer name(s)" />
        </div>
        <div>
          <Label htmlFor="songwriter_credits">Songwriter Credits</Label>
          <Input id="songwriter_credits" value={formData.songwriter_credits} onChange={(e) => onInputChange('songwriter_credits', e.target.value)} placeholder="Songwriter name(s)" />
        </div>
        <div>
          <Label htmlFor="copyright_info">Copyright Information</Label>
          <Input id="copyright_info" value={formData.copyright_info} onChange={(e) => onInputChange('copyright_info', e.target.value)} placeholder="© 2026 Artist Name" />
        </div>
        <div>
          <Label htmlFor="upc">UPC/Barcode (Optional)</Label>
          <Input id="upc" value={formData.upc} onChange={(e) => onInputChange('upc', e.target.value)} placeholder="Universal Product Code" />
        </div>
      </div>

      <div>
        <Label htmlFor="submission_notes">Additional Notes</Label>
        <Textarea id="submission_notes" value={formData.submission_notes} onChange={(e) => onInputChange('submission_notes', e.target.value)} placeholder="Any additional information" rows={3} />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button type="button" onClick={onNext} disabled={!coverArt}>Continue to Distribution <ChevronRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}
