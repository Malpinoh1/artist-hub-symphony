import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Smartphone, ShieldCheck, Play, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type AppRelease = {
  version_code: number;
  version_name: string;
  release_notes: string;
  apk_url: string;
  published_at: string | null;
};

const DownloadApp = () => {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_releases' as any)
          .select('version_code,version_name,release_notes,apk_url,published_at')
          .eq('is_published', true)
          .order('version_code', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (active) setRelease((data as AppRelease | null) ?? null);
      } catch (error) {
        console.error('Could not load Android app release:', error);
        if (active) setRelease(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const notes = (release?.release_notes ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <main className="px-4 pb-20 pt-28">
        <div className="mx-auto max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to MALPINOHdistro</Link>
          </Button>

          <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-5">
              <Badge variant="secondary" className="w-fit">Official Android app</Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your music workspace, in your pocket.</h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Access your MALPINOHdistro dashboard more easily from your Android phone. Download updates only from our official website.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {release ? (
                  <Button size="lg" asChild>
                    <a href={release.apk_url} rel="noopener noreferrer">
                      <Download className="mr-2 h-5 w-5" />Download APK · v{release.version_name}
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" disabled>
                    <Download className="mr-2 h-5 w-5" />{loading ? 'Checking latest release…' : 'APK coming soon'}
                  </Button>
                )}
                <Button size="lg" variant="outline" disabled aria-disabled="true">
                  <Play className="mr-2 h-5 w-5" />Google Play · Coming Soon
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Android may ask you to confirm installation from your browser. Only install APKs downloaded from this official MALPINOHdistro page.
              </p>
            </div>

            <Card className="overflow-hidden border-primary/20 shadow-xl">
              <CardHeader className="bg-primary/5">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Smartphone className="h-8 w-8" />
                </div>
                <CardTitle>{release ? `MALPINOHdistro v${release.version_name}` : 'MALPINOHdistro for Android'}</CardTitle>
                <CardDescription>
                  {loading ? 'Checking release information…' : release ? `Build ${release.version_code}` : 'The next release will appear here when published.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Official release</p>
                    <p className="text-sm text-muted-foreground">Published by the MALPINOHdistro team.</p>
                  </div>
                </div>
                {release && notes.length > 0 && (
                  <div>
                    <h2 className="mb-2 font-semibold">What’s new</h2>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {notes.map((note, index) => <li key={index}>{note}</li>)}
                    </ul>
                  </div>
                )}
                {release?.published_at && (
                  <p className="text-xs text-muted-foreground">
                    Published {new Date(release.published_at).toLocaleDateString()}
                  </p>
                )}
                {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading release" />}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DownloadApp;
