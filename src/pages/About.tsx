import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import { Music, Globe, BarChart3, Wallet, Users, ShieldCheck, Sparkles, FileText } from 'lucide-react';

const pillars = [
  {
    icon: Music,
    title: 'Global distribution',
    text: 'Releases delivered to 150+ digital streaming platforms and stores through our distribution partners.',
  },
  {
    icon: BarChart3,
    title: 'Reported analytics',
    text: 'Streams, top tracks and monthly trends drawn from the statements we actually receive — never estimates.',
  },
  {
    icon: Wallet,
    title: 'Transparent royalties',
    text: 'Earnings in USD, downloadable monthly statements, royalty splits for collaborators and withdrawals on request.',
  },
  {
    icon: Users,
    title: 'Teams and labels',
    text: 'Invite managers and collaborators with tiered access, or run several artist accounts from one login.',
  },
];

const values = [
  'Artist empowerment — you keep ownership of your masters',
  'Transparency in reporting and payouts',
  'Support that answers, from real people',
  'Built in Nigeria, delivering worldwide',
];

const About = () => {
  return (
    <>
      <Seo
        title="About MALPINOHDISTRO | Independent Music Distribution Company"
        description="MALPINOHDISTRO is an independent music distribution company founded in 2023 in Lagos, Nigeria, helping independent artists and labels release music worldwide with transparent royalties."
        path="/about"
        keywords="MALPINOHDISTRO, about, independent music distribution company, Nigeria music distribution, music distributor"
        includeOrganization
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'About MALPINOHDISTRO',
            url: `${COMPANY.url}/about`,
            mainEntity: { '@id': `${COMPANY.url}/#organization` },
          },
        ]}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <header className="mb-12 text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">
                ABOUT THE COMPANY
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                About MALPINOHDISTRO
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                An independent music distribution company and artist platform — built in Lagos,
                delivering music worldwide.
              </p>
            </header>

            <section className="glass-card p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Who we are</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  MALPINOHDISTRO is an independent digital music distribution company serving
                  independent artists, producers and labels. We work with established third-party
                  music aggregators and distribution partners to deliver releases to digital
                  streaming platforms and stores around the world, and we run everything around that
                  delivery ourselves: release review, catalogue management, royalty reporting,
                  analytics, payouts and artist support.
                </p>
                <p>
                  We do not own or operate the streaming services our clients' music appears on. Our
                  role is to prepare, deliver and account for your music, and to give you a single
                  dashboard where your releases, streams and earnings live together.
                </p>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <section className="glass-card p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-3">Our mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To make global music distribution simple, affordable and transparent for
                  independent creators — so an artist without a label still has professional
                  infrastructure behind every release.
                </p>
              </section>
              <section className="glass-card p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-3">Our story</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Founded on 7 June 2023 by {COMPANY.founder}, MALPINOHDISTRO was created to close a
                  real gap: Nigerian and African artists needed affordable distribution with clear
                  reporting and support they could actually reach. That is still the company we are
                  building.
                </p>
              </section>
            </div>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-6">What we do today</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pillars.map((p) => (
                  <div key={p.title} className="glass-card p-5 flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <p.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card p-6 md:p-8 mb-10">
              <h2 className="text-2xl font-semibold mb-4">What we stand for</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {values.map((v) => (
                  <li key={v} className="flex items-start gap-2 text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 mb-10">
              <h2 className="text-2xl font-semibold mb-4">Beyond distribution</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Sparkles className="w-5 h-5 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Artist Hub</h3>
                  <p className="text-sm text-muted-foreground">
                    Guided help claiming a YouTube Official Artist Channel and TikTok artist
                    certification.
                  </p>
                </div>
                <div>
                  <FileText className="w-5 h-5 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Royalty statements</h3>
                  <p className="text-sm text-muted-foreground">
                    Branded monthly PDF statements you can hand to a manager, label or accountant.
                  </p>
                </div>
                <div>
                  <Globe className="w-5 h-5 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Milestones</h3>
                  <p className="text-sm text-muted-foreground">
                    Streaming achievements unlock automatically, with shareable promo cards for
                    socials.
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 md:p-8 text-center">
              <h2 className="text-2xl font-semibold mb-3">Company information</h2>
              <p className="text-muted-foreground mb-2">
                {COMPANY.name} · {COMPANY.location} · Founded 2023
              </p>
              <p className="text-muted-foreground mb-6">
                Official contact:{' '}
                <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>
                  {COMPANY.email}
                </a>
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/auth" className="btn-primary px-6 py-3">
                  Start distributing
                </Link>
                <a
                  href={COMPANY.companyProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  View official company profile
                </a>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default About;
