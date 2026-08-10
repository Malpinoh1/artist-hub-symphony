import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import { Mail, Phone, MapPin, Send, Building2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name || !formState.email || !formState.message) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Message sent',
        description: "We've received your message and will get back to you soon!",
      });

      setFormState({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'There was a problem sending your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="Contact MALPINOHDISTRO | Music Distribution Support"
        description={`Contact MALPINOHDISTRO for music distribution support, partnerships or label enquiries. Email ${COMPANY.email} or send us a message — we're based in Lagos, Nigeria and serve artists worldwide.`}
        path="/contact"
        keywords="contact MALPINOHDISTRO, music distribution support, artist support, label enquiries"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact MALPINOHDISTRO',
            url: `${COMPANY.url}/contact`,
            mainEntity: {
              '@type': 'Organization',
              '@id': `${COMPANY.url}/#organization`,
              name: COMPANY.name,
              email: COMPANY.email,
              telephone: '+2347072218477',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Lagos',
                addressCountry: 'NG',
              },
            },
          },
        ]}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <header className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">GET IN TOUCH</p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Contact MALPINOHDISTRO</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Questions about distribution, royalties, teams or partnerships? Our support team
                replies to every message.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Email us</h2>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="block text-primary hover:underline break-all"
                >
                  {COMPANY.email}
                </a>
                <p className="text-sm text-muted-foreground mt-1">Official contact address</p>
              </div>

              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Call us</h2>
                <a href="tel:+2347072218477" className="block text-primary hover:underline">
                  +234 707 221 8477
                </a>
                <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Mon–Fri, 9am–5pm WAT
                </p>
              </div>

              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Where we are</h2>
                <p className="text-muted-foreground">{COMPANY.location}</p>
                <p className="text-sm text-muted-foreground mt-1">Serving artists worldwide</p>
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 mb-12 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Company information</h2>
                <p className="text-sm text-muted-foreground">
                  {COMPANY.name} — independent digital music distribution company, founded 7 June
                  2023 by {COMPANY.founder}, based in {COMPANY.location}.{' '}
                  <a
                    href={COMPANY.companyProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View our official company profile
                  </a>
                  .
                </p>
              </div>
            </div>

            <section className="glass-panel p-6 md:p-8">
              <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="label">
                      Your Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formState.name}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="label">
                      Your Email*
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formState.email}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="label">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="What is your message about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="label">
                    Message*
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formState.message}
                    onChange={handleChange}
                    className="input-field min-h-[150px]"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </section>

            <section className="mt-12 text-center">
              <h2 className="text-xl font-semibold mb-4">Find us on social media</h2>
              <div className="flex gap-4 justify-center">
                {[
                  { href: 'https://twitter.com/malpinohdistro', label: 'X (Twitter)' },
                  { href: 'https://instagram.com/malpinohdistro', label: 'Instagram' },
                  { href: 'https://facebook.com/malpinohdistro', label: 'Facebook' },
                  { href: 'https://youtube.com/malpinohdistro', label: 'YouTube' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Contact;
