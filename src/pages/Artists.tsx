import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import {
  Rocket,
  BarChart3,
  Wallet,
  Split,
  Users,
  Trophy,
  BadgeCheck,
  LifeBuoy,
  FileText,
  Building2,
} from 'lucide-react';

const tools = [
  {
    icon: Rocket,
    title: 'Release wizard',
    text: 'Submit singles, EPs and albums in guided steps with drafts saved as you go, plus store and territory selection per release.',
  },
  {
    icon: BarChart3,
    title: 'Performance dashboard',
    text: 'Reported streams, monthly trends, top tracks and best releases, all drawn from processed royalty statements.',
  },
  {
    icon: Wallet,
    title: 'Earnings and withdrawals',
    text: 'A clear USD balance, transaction history and withdrawal requests reviewed by our finance team.',
  },
  {
    icon: FileText,
    title: 'Monthly statements',
    text: 'Branded PDF royalty statements you can download for any reported period.',
  },
  {
    icon: Split,
    title: 'Royalty splits',
    text: 'Assign percentage shares on a release and invite collaborators by email to confirm their split.',
  },
  {
    icon: Trophy,
    title: 'Streaming milestones',
    text: 'Achievements unlock automatically from 100 to 10M streams, with shareable promo cards for Instagram, WhatsApp and Facebook.',
  },
  {
    icon: BadgeCheck,
    title: 'Artist Hub',
    text: 'Request a YouTube Official Artist Channel and complete TikTok artist certification with step-by-step guidance.',
  },
  {
    icon: Users,
    title: 'Teams and multiple artists',
    text: 'Invite managers with tiered permissions, or manage several artist profiles from a single account.',
  },
  {
    icon: LifeBuoy,
    title: 'Support tickets',
    text: 'Message our team directly and get email notifications on replies and release status changes.',
  },
];

const audiences = [
  {
    title: 'Independent artists',
    text: 'Release on your own terms, keep your masters, and see exactly what each track earns without chasing anyone for a report.',
  },
  {
    title: 'Producers and collaborators',
    text: 'Get your share handled up front with royalty splits confirmed by email before any payout is made.',
  },
  {
    title: 'Labels and managers',
    text: 'Run a roster from one login, delegate access by role, and pull statements per artist when you need documentation.',
  },
];

const Artists = () => {
  return (
    <>
      <Seo
        title="For Artists | Tools, Royalties & Support — MALPINOHDISTRO"
        description="MALPINOHDISTRO gives independent artists, producers and labels a full release platform: distribution to 150+ platforms, reported analytics, royalty splits, statements, milestones and real support."
        path="/artists"
        keywords="for artists, independent artist platform, music royalties dashboard, royalty splits, artist tools, label services Nigeria"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For Artists', path: '/artists' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'For Artists — MALPINOHDISTRO',
            url: `${COMPANY.url}/artists`,
            about: { '@id': `${COMPANY.url}/#organization` },
            mainEntity: {
              '@type': 'ItemList',
              name: 'Artist tools',
              itemListElement: tools.map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: t.title,
                description: t.text,
              })),
            },
          },
        ]}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <header className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">
                FOR ARTISTS
              </p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                Built for independent artists and labels
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                MALPINOHDISTRO is more than delivery. Every artist account comes with the reporting,
                royalty and career tools that usually sit behind a label.
              </p>
            </header>

            <section className="mb-14">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                What you get in your artist account
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => (
                  <article key={t.title} className="glass-card p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <t.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mb-14">
              <h2 className="text-2xl font-semibold mb-6 text-center">Who we work with</h2>
              <div className="grid gap-5 md:grid-cols-3">
                {audiences.map((a) => (
                  <article key={a.title} className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-2">{a.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="glass-card p-6 md:p-8 mb-14">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Honest reporting, by design</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Every stream and dollar in your dashboard comes from royalty statements we have
                    actually received and processed — no estimates, no inflated numbers. That means
                    figures update on the normal reporting cycle, and what you see is what you can be
                    paid.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-8 text-center">
              <h2 className="text-2xl font-semibold mb-3">Join MALPINOHDISTRO</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Create your artist account today, or ask us anything at{' '}
                <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>
                  {COMPANY.email}
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/auth" className="btn-primary px-6 py-3">
                  Create free account
                </Link>
                <Link
                  to="/distribution"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  How distribution works
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

export default Artists;
