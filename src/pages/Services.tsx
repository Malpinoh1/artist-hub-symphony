import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import {
  Music,
  Globe,
  BarChart3,
  Wallet,
  Users,
  ShieldCheck,
  Sparkles,
  FileText,
  LifeBuoy,
  Split,
} from 'lucide-react';

const services = [
  {
    icon: Music,
    title: 'Music distribution',
    description:
      'Submit singles, EPs and albums through our guided release wizard. We review every delivery and place it with digital streaming platforms and stores worldwide through our distribution partners.',
  },
  {
    icon: Globe,
    title: 'Store and territory control',
    description:
      'Choose the stores and territories each release goes to, set the release date, and track delivery status from your dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Reported analytics',
    description:
      'Reported streams, monthly trends, top tracks and best-performing releases — sourced from the royalty statements we receive and process.',
  },
  {
    icon: Wallet,
    title: 'Royalty tracking and payouts',
    description:
      'Earnings tracked in USD with a clear account balance, plus withdrawal requests reviewed and processed by our finance team.',
  },
  {
    icon: FileText,
    title: 'Monthly royalty statements',
    description:
      'Download branded PDF statements for any reported period — documentation you can share with managers, labels or accountants.',
  },
  {
    icon: Split,
    title: 'Royalty splits',
    description:
      'Set percentage splits on a release and invite collaborators by email to confirm their share, so co-writers and features are handled before payout.',
  },
  {
    icon: Users,
    title: 'Team and label access',
    description:
      'Invite managers or team members with viewer, manager or admin permissions, and manage multiple artist accounts from a single login.',
  },
  {
    icon: Sparkles,
    title: 'Artist Hub',
    description:
      'Step-by-step support requesting a YouTube Official Artist Channel and completing TikTok artist certification.',
  },
  {
    icon: ShieldCheck,
    title: 'Catalogue management',
    description:
      'Update release details, add streaming links, and submit takedown or edit requests for anything already delivered.',
  },
  {
    icon: LifeBuoy,
    title: 'Artist support',
    description:
      'Support tickets with real-time replies from our team, plus email notifications so you never miss an update on a release.',
  },
];

const Services = () => {
  return (
    <>
      <Seo
        title="Music Distribution Services | MALPINOHDISTRO"
        description="Explore MALPINOHDISTRO services: worldwide music distribution, reported streaming analytics, royalty tracking and statements, royalty splits, team access and artist support."
        path="/services"
        keywords="music distribution services, royalty management, streaming analytics, royalty splits, label services, artist support"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'MALPINOHDISTRO services',
            itemListElement: services.map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Service',
                name: s.title,
                description: s.description,
                provider: { '@id': `${COMPANY.url}/#organization` },
                areaServed: 'Worldwide',
                url: `${COMPANY.url}/services`,
              },
            })),
          },
        ]}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <header className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">
                WHAT WE OFFER
              </p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Our services</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything an independent artist or label needs to release music worldwide and get
                paid for it — delivery, reporting, royalties and support in one platform.
              </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-14">
              {services.map((s) => (
                <article key={s.title} className="glass-card p-6 flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </article>
              ))}
            </div>

            <section className="glass-card p-6 md:p-8 mb-10">
              <h2 className="text-2xl font-semibold mb-4">How we deliver</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                MALPINOHDISTRO is an independent distribution company. We work with third-party music
                aggregators and distribution partners to place approved releases on digital streaming
                platforms and stores. We do not own or operate those platforms; our work is
                preparing, delivering and accounting for your music, and supporting you through every
                release.
              </p>
              <Link to="/distribution" className="text-primary font-medium hover:underline">
                See the full distribution process →
              </Link>
            </section>

            <section className="glass-panel p-8 text-center">
              <h2 className="text-2xl font-semibold mb-3">Ready to release?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Compare plans and start your first delivery, or email us at{' '}
                <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>
                  {COMPANY.email}
                </a>{' '}
                if you have questions first.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/pricing" className="btn-primary px-6 py-3">
                  View pricing
                </Link>
                <Link
                  to="/contact"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  Contact us
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

export default Services;
