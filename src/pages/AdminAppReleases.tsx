import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Smartphone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

type AppRelease = {
  id: string;
  version_code: number;
  version_name: string;
  release_notes: string;
  apk_url: string;
  is_published: boolean;
  published_at: string | null;
};

const AdminAppReleases = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRelease = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_releases' as any)
      .select('id,version_code,version_name,release_notes,apk_url,is_published,published_at')
      .eq('is_published', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Could not load published Android release:', error);
      toast.error('Could not load the current Android release.');
    }
    setRelease((data as AppRelease | null) ?? null);
    setLoading(false);
  };

  useEffect(() => { void loadRelease(); }, []);

  const publish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !apkFile) {
      toast.error('Choose the APK file you want to publish.');
      return;
    }
    const numericCode = Number(versionCode);
    if (!Number.isInteger(numericCode) || numericCode < 1) {
      toast.error('Version code must be a positive whole number.');
      return;
    }
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionName.trim())) {
      toast.error('Enter a version name such as 0.3.0.');
      return;
    }
    if (!apkFile.name.toLowerCase().endsWith('.apk') || apkFile.size > 200 * 1024 * 1024) {
      toast.error('Choose an APK file smaller than 200 MB.');
      return;
    }
    setUploading(true);
    let uploadedPath = '';
    try {
      const safeName = apkFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      uploadedPath = `android/${numericCode}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('app-releases')
        .upload(uploadedPath, apkFile, {
          upsert: false,
          cacheControl: '300',
          contentType: 'application/vnd.android.package-archive',
        });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('app-releases').getPublicUrl(uploadedPath);
      const apkUrl = `${publicData.publicUrl}?download=${encodeURIComponent(safeName)}`;
      const { error: unpublishError } = await supabase
        .from('app_releases' as any)
        .update({ is_published: false })
        .eq('is_published', true);
      if (unpublishError) throw unpublishError;

      const { data: existing, error: lookupError } = await supabase
        .from('app_releases' as any)
        .select('id')
        .eq('version_code', numericCode)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const payload = {
        version_code: numericCode,
        version_name: versionName.trim(),
        release_notes: releaseNotes.trim(),
        apk_url: apkUrl,
        is_published: true,
        published_by: user.id,
        published_at: new Date().toISOString(),
      };
      const result = existing?.id
        ? await supabase.from('app_releases' as any).update(payload).eq('id', existing.id)
        : await supabase.from('app_releases' as any).insert(payload);
      if (result.error) throw result.error;

      toast.success(`MALPINOHdistro v${versionName.trim()} is now published.`);
      setApkFile(null);
      setReleaseNotes('');
      await loadRelease();
    } catch (error) {
      console.error('Android APK publishing failed:', error);
      if (uploadedPath) {
        await supabase.storage.from('app-releases').remove([uploadedPath]).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : 'Could not publish the APK. Check your admin permissions and try again.');
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading Android release settings…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Alert variant="destructive"><AlertDescription>Only a full website administrator can publish Android APK releases.</AlertDescription></Alert>
        <Button variant="outline" asChild className="mt-4"><Link to="/admin">Return to admin dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Button variant="ghost" asChild><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back to Admin Dashboard</Link></Button>
      <div>
        <Badge variant="secondary" className="mb-3">Android app management</Badge>
        <h1 className="text-3xl font-bold">Publish Android update</h1>
        <p className="mt-2 text-muted-foreground">Upload the APK built from Android Studio. Publishing it updates the download page and enables in-app update notices.</p>
      </div>

      {release && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Currently published</CardTitle>
            <CardDescription>Version {release.version_name} · build {release.version_code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {release.release_notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{release.release_notes}</p>}
            <a className="text-sm font-medium text-primary underline" href={release.apk_url} rel="noreferrer">Open published APK</a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5" />Upload a new APK</CardTitle>
          <CardDescription>Use a version code higher than the previous release so installed apps recognize the update.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={publish}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="version-name">Version name</Label>
                <Input id="version-name" placeholder="0.3.0" value={versionName} onChange={(event) => setVersionName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-code">Version code</Label>
                <Input id="version-code" type="number" min="1" step="1" placeholder="3" value={versionCode} onChange={(event) => setVersionCode(event.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="release-notes">What’s new</Label>
              <Textarea id="release-notes" placeholder={'Fixed Android back navigation\nAdded update notifications\nImproved stability'} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} rows={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apk-file">APK file (maximum 200 MB)</Label>
              <Input id="apk-file" type="file" accept=".apk,application/vnd.android.package-archive" onChange={(event) => setApkFile(event.target.files?.[0] ?? null)} required />
              {apkFile && <p className="text-sm text-muted-foreground">{apkFile.name} · {(apkFile.size / (1024 * 1024)).toFixed(1)} MB</p>}
            </div>
            <Alert><AlertDescription>Publishing is immediate: the public download page and app update checker will use this version as soon as the upload is complete.</AlertDescription></Alert>
            <Button type="submit" disabled={uploading || !apkFile} className="w-full sm:w-auto">
              <Smartphone className="mr-2 h-4 w-4" />{uploading ? 'Uploading and publishing…' : 'Publish Android update'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAppReleases;
