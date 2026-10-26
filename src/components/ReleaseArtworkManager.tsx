import { getArtworkDisplayUrl } from '@/lib/artworkDisplay';
import React, { useEffect, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';

type ReleaseArtwork = {
  id: string;
  title: string;
  artist_name: string | null;
  cover_art_url: string | null;
  cover_art_update_count: number;
  status: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getStorageObject = (url: string) => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
};

interface ReleaseArtworkManagerProps { releaseId: string; }

const ReleaseArtworkManager: React.FC<ReleaseArtworkManagerProps> = ({ releaseId }) => {
  const [releases, setReleases] = useState<ReleaseArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { canManage, isLoading: permissionsLoading, currentAccountId } = useTeamPermissions();

  const loadReleases = async () => {
    if (!user) {
      setReleases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('releases')
      .select('id,title,artist_name,cover_art_url,cover_art_update_count,status')
      .eq('id', releaseId)
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load releases', description: error.message, variant: 'destructive' });
    } else {
      setReleases((data || []) as ReleaseArtwork[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!permissionsLoading) void loadReleases();
  }, [user?.id, permissionsLoading, currentAccountId, releaseId]);

  const handleArtworkChange = async (release: ReleaseArtwork, file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported image format', description: 'Choose a JPG, PNG, or WEBP image.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Image is too large', description: 'Cover art must be 10 MB or smaller.', variant: 'destructive' });
      return;
    }
    if (release.cover_art_update_count >= 2) {
      toast({ title: 'Update limit reached', description: 'This release has already used both cover-art updates.', variant: 'destructive' });
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: 'Please sign in again', description: 'Your session is required to update cover art.', variant: 'destructive' });
      return;
    }

    setUploadingId(release.id);
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = `${user.id}/${release.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    let uploadedPath: string | null = null;

    try {
      const { error: uploadError } = await supabase.storage
        .from('release_artwork')
        .upload(objectPath, file, { contentType: file.type, cacheControl: '0', upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = objectPath;

      const { data: publicData } = supabase.storage.from('release_artwork').getPublicUrl(objectPath);
      const { data: rpcData, error: updateError } = await (supabase as any).rpc('update_release_cover_art', {
        p_release_id: release.id,
        p_new_cover_art_url: publicData.publicUrl,
      });
      if (updateError) throw updateError;

      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const oldUrl = result?.previous_cover_art_url ?? release.cover_art_url;

      // Delete the previous file only after the database points to the new one.
      // Keep shared files and files owned by another account intact.
      if (oldUrl && oldUrl !== publicData.publicUrl) {
        const oldObject = getStorageObject(oldUrl);
        if (oldObject && ['release_artwork', 'artwork'].includes(oldObject.bucket)
          && oldObject.path.split('/')[0] === user.id) {
          const { data: references, error: referenceError } = await supabase
            .from('releases')
            .select('id')
            .eq('cover_art_url', oldUrl)
            .neq('id', release.id)
            .limit(1);
          if (!referenceError && (!references || references.length === 0)) {
            await supabase.storage.from(oldObject.bucket).remove([oldObject.path]);
          }
        }
      }

      toast({ title: 'Cover art updated', description: `Update ${Math.min((result?.new_cover_art_update_count ?? release.cover_art_update_count + 1), 2)} of 2 completed. The new artwork is now used across MALPINOHDistro.` });
      await loadReleases();
    } catch (error: any) {
      if (uploadedPath) {
        await supabase.storage.from('release_artwork').remove([uploadedPath]);
      }
      toast({
        title: 'Cover art update failed',
        description: error?.message || 'Please try again. Your current cover art has not been changed.',
        variant: 'destructive',
      });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display tracking-tight"><ImagePlus className="h-5 w-5" /> Update this release’s cover art</CardTitle>
        <CardDescription>
          Choose a new JPG, PNG, or WEBP cover for this release. You can update its artwork twice; the change applies anywhere this release is shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your releases…</div>
        ) : releases.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">This release isn’t available under the currently selected artist account.</p>
        ) : (
          releases.map((release) => {
            const remaining = Math.max(0, 2 - (release.cover_art_update_count || 0));
            const busy = uploadingId === release.id;
            return (
              <div key={release.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {release.cover_art_url ? (
                    <img src={getArtworkDisplayUrl(release.cover_art_url)} alt={`${release.title} cover art`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><ImagePlus className="h-7 w-7 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{release.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{release.artist_name || 'Artist not specified'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{remaining} of 2 artwork updates remaining</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    id={`release-artwork-${release.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={!canManage || busy || remaining === 0}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      void handleArtworkChange(release, file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canManage || busy || remaining === 0}
                    onClick={() => document.getElementById(`release-artwork-${release.id}`)?.click()}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : remaining === 0 ? <RefreshCw className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                    {busy ? 'Updating…' : remaining === 0 ? 'Limit reached' : 'Edit cover art'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default ReleaseArtworkManager;
