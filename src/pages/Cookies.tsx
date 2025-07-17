
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Cookie, Settings, Shield, Eye } from 'lucide-react';

const Cookies = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy - MALPINOHdistro | How We Use Cookies</title>
        <meta name="description" content="Learn about how we use cookies and similar technologies to improve your experience on our platform." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Cookie Policy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Understanding how we use cookies to enhance your experience
              </p>
            </div>

            <div className="space-y-8">
              {/* What are cookies */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Cookie className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>
                        Cookies are small text files that are stored on your device when you visit our website. 
                        They help us provide you with a better experience by remembering your preferences and 
                        understanding how you use our platform.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Types of cookies */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <h2 className="text-2xl font-bold mb-6">Types of Cookies We Use</h2>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-primary pl-6">
                    <h3 className="text-lg font-semibold mb-2 text-primary">Essential Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies are necessary for the website to function properly. They enable core functionality 
                      such as user authentication, security features, and basic navigation. These cookies cannot be disabled.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-6">
                    <h3 className="text-lg font-semibold mb-2 text-blue-600">Performance Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies collect anonymous information about how visitors use our website, such as which 
                      pages are visited most often and if users encounter error messages. This helps us improve our website's performance.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-6">
                    <h3 className="text-lg font-semibold mb-2 text-green-600">Functionality Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies remember your preferences and choices to provide a more personalized experience, 
                      such as language settings, theme preferences, and dashboard customizations.
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-6">
                    <h3 className="text-lg font-semibold mb-2 text-orange-600">Analytics Cookies</h3>
                    <p className="text-muted-foreground">
                      We use analytics cookies to understand how users interact with our platform. This helps us 
                      identify areas for improvement and develop new features that better serve our artists.
                    </p>
                  </div>
                </div>
              </section>

              {/* How we use cookies */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">How We Use Cookies</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <ul className="list-disc ml-6 space-y-2">
                        <li><strong>Authentication:</strong> To keep you logged in during your session</li>
                        <li><strong>Preferences:</strong> To remember your dashboard settings and preferences</li>
                        <li><strong>Security:</strong> To protect against fraudulent activity and unauthorized access</li>
                        <li><strong>Analytics:</strong> To understand user behavior and improve our services</li>
                        <li><strong>Performance:</strong> To optimize loading times and functionality</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Third-party cookies */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>
                        We may also use third-party services that set their own cookies. These include:
                      </p>
                      <ul className="list-disc ml-6 mt-4 space-y-2">
                        <li><strong>Google Analytics:</strong> For website analytics and user behavior tracking</li>
                        <li><strong>Supabase:</strong> For authentication and database services</li>
                        <li><strong>Payment Processors:</strong> For secure payment processing</li>
                      </ul>
                      <p className="mt-4">
                        These third parties have their own privacy policies and cookie policies, which we encourage you to review.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Managing cookies */}
              <section className="glass-panel p-6 md:p-8 animate-slide-up">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Managing Your Cookie Preferences</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p>
                        You have control over which cookies you accept. You can:
                      </p>
                      <ul className="list-disc ml-6 mt-4 space-y-2">
                        <li>Adjust your browser settings to refuse all cookies</li>
                        <li>Delete cookies that have already been stored</li>
                        <li>Set your browser to notify you when cookies are being sent</li>
                        <li>Use private/incognito browsing mode</li>
                      </ul>
                      <div className="bg-muted/50 p-4 rounded-lg mt-6">
                        <p className="font-semibold text-foreground mb-2">Important Note:</p>
                        <p>
                          Please note that disabling certain cookies may affect the functionality of our website 
                          and may prevent you from using some features of our platform.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="glass-panel p-6 md:p-8 text-center animate-scale-in">
                <h2 className="text-2xl font-bold mb-4">Questions About Our Cookie Policy?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  If you have any questions about how we use cookies or want to exercise your rights 
                  regarding cookies, please don't hesitate to contact us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/contact" 
                    className="btn-primary px-8 py-3 text-lg"
                  >
                    Contact Us
                  </a>
                  <a 
                    href="mailto:privacy@malpinoh.com.ng" 
                    className="btn-secondary px-8 py-3 text-lg"
                  >
                    privacy@malpinoh.com.ng
                  </a>
                </div>
              </section>

              {/* Last updated */}
              <div className="text-center text-sm text-muted-foreground animate-fade-in">
                <p>Last updated: January 2024</p>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Cookies;
