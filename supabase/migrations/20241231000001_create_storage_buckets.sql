
-- Create storage buckets for release assets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('release_artwork', 'release_artwork', true),
  ('audio_files', 'audio_files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for release_artwork bucket
CREATE POLICY "Users can upload their own artwork" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'release_artwork' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view artwork" ON storage.objects
  FOR SELECT USING (bucket_id = 'release_artwork');

CREATE POLICY "Users can update their own artwork" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'release_artwork' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own artwork" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'release_artwork' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policies for audio_files bucket
CREATE POLICY "Users can upload their own audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio_files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio_files');

CREATE POLICY "Users can update their own audio files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'audio_files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio_files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
