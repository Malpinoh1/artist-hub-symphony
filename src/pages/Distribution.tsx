import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import {
  Upload,
  ClipboardCheck,
  Send,
  Globe2,
  BarChart3,
  Wallet,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: '1. Build your release',
    text: 'Create the release in the dashboard wizard: album info, cover art, audio files, tracklist, credits, and store and territory preferences. Release dates must be set at least 21 days ahead so stores have time to process and pitch the delivery.',
  },
  {
    icon: ClipboardCheck,
    title: '2. Review and validation',
    text: 'Our distribution team checks metadata, artwork specifications, audio quality, explicit flags and rights information. If something would be rejected downstream, we tell you what to fix instead of letting the release fail silently.',
  },
  {
    icon: Send,
    title: '3. Delivery to stores',
    text: 'Approved releases are delivered through our third-party aggregation and distribution partners to digital streaming platforms and download stores across your selected territories.',
  },
  {
    icon: Globe2,
    title: '4. Going live',
    text: 'Stores ingest and publish the release on the scheduled date. Streaming links appear on the release page in your dashboard as platforms confirm them, and you can request edits or takedowns at any time.',
  },
  {
    icon: BarChart3,
    title: '5. Reporting',
    text: 'As statements arrive from stores, we process them and update your reported streams, downloads and earnings — broken down by month, track and release inside your dashboard.',
  },
  {
    icon: Wallet,
    title: '6. Royalties and payouts',
    text: 'Earnings accumulate in USD against your account balance. Apply royalty splits so collaborators are settled correctly, then request a withdrawal for our finance team to review and pay out.',
  },
];

const faqs = [
  {
    q: 'Which platforms does MALPINOHDISTRO deliver to?',
    a: 'Releases are delivered to 150+ digital streaming platforms and stores, including Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, Boomplay, Audiomack, Anghami, TikTok and more, depending on the stores you select for each release.',
  },
  {
    q: 'How long does distribution take?',
    a: 'After approval, most stores publish on your chosen release date. We ask for a minimum of 21 days between submission and release date so there is room for review, delivery and editorial pitching.',
  },
  {
    q: 'Do I keep my rights and royalties?',
    a: 'Yes. You keep ownership of your masters. MALPINOHDISTRO distributes and accounts for your music; we do not take ownership of your recordings or compositions.',
  },
  {
    q: 'How are streams and earnings calculated?',
    a: 'Everything shown in your dashboard comes from royalty statements we receive from stores and process into your account. Reported figures are actual reported data, not estimates, so they lag store dashboards by the normal reporting cycle.',
  },
  {
    q: 'Can a label or manager use one account for several artists?',
    a: 'Yes. You can run multiple artist accounts under one login and invite team members with viewer, manager or admin permissions.',
  },
  {
    q: 'What does distribution cost?',
    a: 'Plans are priced in USD: pay per release, an annual plan, or an unlimited plan. Full details are on the pricing page.',
  },
];

const Distribution = () => {
  return (
    <>
      <Seo
        title="Music Distribution Process | MALPINOHDISTRO"
        description="How MALPINOHDISTRO distributes music worldwide: release submission, metadata review, delivery to 150+ streaming platforms, reported analytics, royalty statements and payouts."
        path="/distribution"
        keywords="music distribution process, how to distribute music, release to Spotify Apple Music, digital music delivery, royalty reporting"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Distribution', path: '/distribution' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to distribute your music with MALPINOHDISTRO',
            description:
              'The MALPINOHDISTRO release journey, from building a release in the dashboard to royalty payouts.',
            step: steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.title.replace(/^\d+\.\s*/, ''),
              text: s.text,
              url: `${COMPANY.url}/distribution`,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ]}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <header className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">
                DISTRIBUTION
              </p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                How music distribution works at MALPINOHDISTRO
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From upload to payout — the exact path your release takes through our platform and
                out to 150+ digital streaming platforms and stores worldwide.
              </p>
            </header>

            <section className="space-y-4 mb-14">
              <h2 className="sr-only">The release journey</h2>
              {steps.map((s) => (
                <article key={s.title} className="glass-card p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.text}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-6 md:grid-cols-2 mb-14">
              <div className="glass-card p-6">
                <CalendarClock className="w-5 h-5 text-primary mb-3" />
                <h2 className="text-xl font-semibold mb-2">Release timing rules</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Set release dates at least 21 days ahead. That window covers our review, store
                  ingestion time and editorial consideration — releases scheduled too tightly risk
                  going live late or missing playlist pitching entirely.
                </p>
              </div>
              <div className="glass-card p-6">
                <ShieldCheck className="w-5 h-5 text-primary mb-3" />
                <h2 className="text-xl font-semibold mb-2">Rights and compliance</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You must control the rights to everything you deliver — recordings, samples,
                  artwork and cover-song licences. Releases that infringe rights or breach store
                  guidelines are rejected or taken down, and our team will explain why.
                </p>
              </div>
            </section>

            <section className="mb-14">
              <h2 className="text-2xl font-semibold mb-6">Distribution FAQs</h2>
              <div className="space-y-4">
                {faqs.map((f) => (
                  <article key={f.q} className="glass-card p-6">
                    <h3 className="font-semibold mb-2">{f.q}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.a}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="glass-panel p-8 text-center">
              <h2 className="text-2xl font-semibold mb-3">Start your next release</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Create an account, pick a plan and submit your first release — or reach us at{' '}
                <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>
                  {COMPANY.email}
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/auth" className="btn-primary px-6 py-3">
                  Get started
                </Link>
                <Link
                  to="/pricing"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  View pricing
                </Link>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Distribution;
