import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
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
    <div className="min-h-screen overflow-hidden bg-[#080611] text-white">
      <Navbar />

      <main className="relative isolate px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
          <div className="absolute right-[-12rem] top-[35rem] h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[100px]" />
          <div className="absolute left-[-12rem] top-[48rem] h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.075)_1px,transparent_1px)] [background-size:28px_28px] opacity-30" />
        </div>

        <div className="mx-auto max-w-6xl">
          <Button
            variant="ghost"
            asChild
            className="mb-8 rounded-full border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white"
          >
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to MALPINOHdistro</Link>
          </Button>

          <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="space-y-7">
              <Badge className="rounded-full border border-purple-300/25 bg-purple-400/10 px-4 py-1.5 text-purple-100 hover:bg-purple-400/10">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                THE OFFICIAL ANDROID APP
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  Your music business.
                  <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 bg-clip-text pb-2 text-transparent">
                    Wherever you go.
                  </span>
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                  Take MALPINOHdistro with you. Access your music distribution workspace from your Android phone and stay connected to your releases on the move.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" /> Official download
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Smartphone className="h-4 w-4 text-purple-300" /> Made for Android
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Zap className="h-4 w-4 text-amber-300" /> Quick access
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href={release?.apk_url || undefined}
                  aria-disabled={!release || loading}
                  onClick={(event) => { if (!release || loading) event.preventDefault(); }}
                  className={`group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border p-5 transition duration-300 ${release && !loading
                    ? 'border-purple-300/40 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 shadow-[0_16px_60px_rgba(124,58,237,0.24)] hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(124,58,237,0.36)]'
                    : 'cursor-not-allowed border-white/10 bg-white/[0.04] opacity-75'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                      <Download className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                      {release ? 'Available now' : loading ? 'Checking' : 'Preparing'}
                    </span>
                  </div>
                  <div className="mt-6">
                    <p className="text-lg font-bold">Download for Android</p>
                    <p className="mt-1 text-sm text-white/75">
                      {release ? `APK installer · v${release.version_name}` : loading ? 'Checking the latest release…' : 'The next APK will appear here.'}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                      {release && !loading ? 'Download APK' : loading ? 'Please wait' : 'Not available yet'}
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />}
                    </div>
                  </div>
                </a>

                <div className="relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#11101b] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-2.5">
                      <svg viewBox="0 0 48 48" role="img" aria-label="Google Play logo" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#00D6FF" d="M5.2 3.6C4.5 4.3 4 5.4 4 6.9v34.2c0 1.5.5 2.6 1.2 3.3L25 24 5.2 3.6Z" />
                        <path fill="#00F076" d="M5.2 3.6 29.1 17.4 22.3 24 5.2 3.6Z" />
                        <path fill="#FFCE00" d="M29.1 17.4 41.6 24.6c2.1 1.2 2.1 3.2 0 4.4L29 36.2 22.3 24l6.8-6.6Z" />
                        <path fill="#FF3A44" d="M5.2 44.4 29 30.6 22.3 24 5.2 44.4Z" />
                      </svg>
                    </span>
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                      Coming soon
                    </span>
                  </div>
                  <div className="mt-6">
                    <p className="text-lg font-bold">Google Play</p>
                    <p className="mt-1 text-sm text-white/50">Get it on Google Play when the official listing launches.</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/45">
                      Coming soon <Clock3 className="h-4 w-4" />
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 h-24 w-24 translate-x-8 translate-y-8 rounded-full bg-amber-400/5 blur-2xl" />
                </div>
              </div>

              <p className="max-w-xl text-xs leading-5 text-white/45">
                The website APK is the only available install option right now. The Google Play button is intentionally marked as coming soon and will become available after the Play Store release.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div aria-hidden="true" className="absolute inset-8 rounded-[3rem] bg-purple-600/20 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.025] p-3 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#0c0a16] p-5 sm:p-7">
                  <div className="flex items-center justify-between border-b border-white/10 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-900/40">
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">MALPINOHdistro</p>
                        <p className="text-xs text-white/45">Android application</p>
                      </div>
                    </div>
                    <Badge className="border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/10">
                      Official
                    </Badge>
                  </div>

                  <div className="py-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">YOUR CREATOR WORKSPACE</p>
                    <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">Keep your music moving.</h2>
                    <p className="mt-3 text-sm leading-6 text-white/55">
                      Your MALPINOHdistro experience, designed to travel with you.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: CheckCircle2, title: 'Your account, on the go', detail: 'Get to your workspace from your phone.' },
                      { icon: FileCheck2, title: 'Release information', detail: 'Keep up with app releases and improvements.' },
                      { icon: ShieldCheck, title: 'Official source', detail: 'Download from the MALPINOHdistro website.' },
                    ].map(({ icon: Icon, title, detail }) => (
                      <div key={title} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-400/10 text-purple-200">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-white/45">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-white/45">LATEST PUBLISHED VERSION</p>
                        <p className="mt-1 font-semibold">{release ? `Version ${release.version_name}` : loading ? 'Checking release…' : 'Awaiting release'}</p>
                      </div>
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-purple-300" />
                      ) : release ? (
                        <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-200">Published</span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/45">Pending</span>
                      )}
                    </div>
                    {release?.published_at && (
                      <p className="mt-2 text-xs text-white/40">Published {new Date(release.published_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#171324] px-4 py-3 shadow-xl sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Official app source</p>
                  <p className="text-[11px] text-white/45">MALPINOHdistro website</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-24 border-t border-white/10 pt-12">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-300">SIMPLE SETUP</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Get started in three steps.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50">
                Download the current release from this page and follow Android’s installation prompts.
              </p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                { number: '01', icon: Download, title: 'Download the APK', detail: 'Use the purple Download for Android card above to get the latest published installer.' },
                { number: '02', icon: Smartphone, title: 'Allow installation', detail: 'If Android prompts you, allow your browser to install apps for this installation.' },
                { number: '03', icon: CheckCircle2, title: 'Open the app', detail: 'Finish installing, then open MALPINOHdistro and sign in to your account.' },
              ].map(({ number, icon: Icon, title, detail }) => (
                <Card key={number} className="border-white/10 bg-white/[0.035] text-white shadow-none">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-300/20 bg-purple-300/10 text-purple-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-sm font-bold tracking-[0.18em] text-white/25">{number}</span>
                    </div>
                    <CardTitle className="pt-2 text-lg text-white">{title}</CardTitle>
                    <CardDescription className="leading-6 text-white/50">{detail}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          {release && notes.length > 0 && (
            <section className="mt-16">
              <Card className="border-white/10 bg-white/[0.035] text-white shadow-none">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border border-purple-300/20 bg-purple-300/10 text-purple-200 hover:bg-purple-300/10">Release notes</Badge>
                    <span className="text-xs text-white/40">Version {release.version_name} · Build {release.version_code}</span>
                  </div>
                  <CardTitle className="text-2xl text-white">What’s new</CardTitle>
                  <CardDescription className="text-white/50">The latest improvements included in the published Android release.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {notes.map((note, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm leading-6 text-white/70">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />{note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}

          <section className="mt-16 rounded-2xl border border-amber-200/15 bg-amber-200/[0.045] p-5 sm:flex sm:items-start sm:gap-4 sm:p-6">
            <span className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/10 text-amber-200 sm:mb-0">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">A quick installation and safety note</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Android may ask you to confirm installing an app downloaded outside Google Play. Only install MALPINOHdistro APK files obtained from this official website. The Google Play Store option will remain unavailable until the official listing is ready.
              </p>
            </div>
          </section>

          <div className="mt-10 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
              <ExternalLink className="h-4 w-4" /> Explore MALPINOHdistro
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DownloadApp;
