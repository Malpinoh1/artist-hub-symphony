import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TracklistManager } from '@/components/TracklistManager';
import { ChevronRight, ChevronLeft, Music, X } from 'lucide-react';

interface StepTrackUploadProps {
  formData: any;
  tracks: any[];
  onTracksChange: (tracks: any[]) => void;
  audioFiles: File[];
  onAudioFilesChange: (files: File[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepTrackUpload({ formData, tracks, onTracksChange, audioFiles, onAudioFilesChange, onNext, onPrev }: StepTrackUploadProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onAudioFilesChange([...audioFiles, ...newFiles]);
    }
  };

  const removeAudioFile = (index: number) => {
    onAudioFilesChange(audioFiles.filter((_, i) => i !== index));
  };

  const canProceed = tracks.length > 0 && tracks.every(t => t.title.trim()) && audioFiles.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1">Track Upload</h2>
        <p className="text-sm text-muted-foreground">Add your tracks and upload audio files</p>
      </div>

      <TracklistManager
        releaseType={formData.release_type as 'single' | 'ep' | 'album'}
        tracks={tracks}
        onTracksChange={onTracksChange}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio Files *</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => audioInputRef.current?.click()}
          >
            <Music className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-1 text-sm">Upload Audio Files</h3>
            <p className="text-xs text-muted-foreground">WAV, MP3, FLAC — Max 50MB per file</p>
            <input ref={audioInputRef} type="file" accept="audio/wav,audio/mpeg,audio/flac" onChange={handleAudioChange} multiple className="hidden" />
          </div>
          {audioFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Uploaded ({audioFiles.length})</h4>
              {audioFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAudioFile(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button type="button" onClick={onNext} disabled={!canProceed}>Continue to Artwork <ChevronRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}
