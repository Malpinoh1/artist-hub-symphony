
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Shield, AlertTriangle, FileText, Mail } from 'lucide-react';

const Copyright = () => {
  return (
    <>
      <Helmet>
        <title>Copyright Information - MALPINOHdistro | Music Rights & Protection</title>
        <meta name="description" content="Learn about copyright protection, music rights, and how we help protect your intellectual property." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Copyright Information
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Understanding your rights and protecting your musical creations
              </p>
            </div>

            <div className="space-y-8">
              {/* Copyright Basics */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Copyright Basics</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>
                        Copyright is an automatic legal protection that applies to original musical works from the moment they are created and fixed in a tangible form. This includes:
                      </p>
                      <ul className="list-disc ml-6 mt-4 space-y-2">
                        <li>Musical compositions (melody, harmony, lyrics)</li>
                        <li>Sound recordings (the actual recorded performance)</li>
                        <li>Arrangements and adaptations of existing works</li>
                        <li>Album artwork and liner notes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Your Rights */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Rights as a Copyright Owner</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>As the copyright owner of your musical work, you have exclusive rights to:</p>
                      <ul className="list-disc ml-6 mt-4 space-y-2">
                        <li><strong>Reproduce</strong> your work (make copies)</li>
                        <li><strong>Distribute</strong> copies to the public</li>
                        <li><strong>Perform</strong> your work publicly</li>
                        <li><strong>Create derivative works</strong> (remixes, covers, etc.)</li>
                        <li><strong>Display</strong> your work publicly</li>
                        <li><strong>License</strong> these rights to others</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Copyright Infringement */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Copyright Infringement</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>
                        Copyright infringement occurs when someone uses your copyrighted material without permission. Common examples include:
                      </p>
                      <ul className="list-disc ml-6 mt-4 space-y-2">
                        <li>Unauthorized reproduction or distribution of your music</li>
                        <li>Using your music in videos, podcasts, or other content without permission</li>
                        <li>Sampling your work without proper clearance</li>
                        <li>Performing your music publicly without appropriate licenses</li>
                      </ul>
                      <div className="bg-muted/50 p-4 rounded-lg mt-6">
                        <p className="font-semibold text-foreground mb-2">What to do if your copyright is infringed:</p>
                        <ol className="list-decimal ml-6 space-y-1">
                          <li>Document the infringement with screenshots and links</li>
                          <li>Contact the infringer directly if possible</li>
                          <li>File a DMCA takedown notice with the platform</li>
                          <li>Contact us for assistance with the process</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* How We Protect You */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <h2 className="text-2xl font-bold mb-6">How MALPINOHdistro Protects Your Copyright</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Metadata Protection</h3>
                    <p className="text-muted-foreground">
                      We embed proper copyright information in all distributed files, ensuring your ownership is clearly identified.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Platform Monitoring</h3>
                    <p className="text-muted-foreground">
                      We work with streaming platforms to monitor for unauthorized use and help resolve copyright disputes.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">DMCA Support</h3>
                    <p className="text-muted-foreground">
                      Our team assists with DMCA takedown requests and copyright enforcement procedures.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">Legal Resources</h3>
                    <p className="text-muted-foreground">
                      Access to legal guidance and resources for serious copyright infringement cases.
                    </p>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="glass-panel p-6 md:p-8 text-center animate-scale-in">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-4">Need Copyright Assistance?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  If you believe your copyright has been infringed or need help understanding your rights, 
                  our team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/contact" 
                    className="btn-primary px-8 py-3 text-lg"
                  >
                    Contact Support
                  </a>
                  <a 
                    href="mailto:copyright@malpinoh.com.ng" 
                    className="btn-secondary px-8 py-3 text-lg"
                  >
                    copyright@malpinoh.com.ng
                  </a>
                </div>
              </section>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Copyright;
