
import React from 'react';
import { Phone, Instagram, Mail, FileText, HelpCircle, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';

const HelpCenter = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Help Center</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Get the support you need to make the most of our music distribution services.
              </p>
            </div>
          </AnimatedCard>
          
          <AnimatedCard>
            <div className="glass-panel p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <MessageSquare className="mr-2 h-6 w-6 text-blue-600" />
                Contact Us
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-6 bg-white rounded-lg border border-slate-200">
                  <Phone className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Phone</h3>
                  <p className="text-slate-600 mb-3">Call us directly:</p>
                  <a href="tel:+2347072218477" className="text-blue-600 hover:underline font-medium">
                    +234 7072 218 477
                  </a>
                </div>
                
                <div className="p-6 bg-white rounded-lg border border-slate-200">
                  <Instagram className="h-8 w-8 text-purple-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Instagram</h3>
                  <p className="text-slate-600 mb-3">Follow us for updates:</p>
                  <a 
                    href="https://instagram.com/malpinohdistro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-medium"
                  >
                    @malpinohdistro
                  </a>
                </div>
                
                <div className="p-6 bg-white rounded-lg border border-slate-200">
                  <Mail className="h-8 w-8 text-green-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Email</h3>
                  <p className="text-slate-600 mb-3">Send us a message:</p>
                  <a href="mailto:info@malpinohdistro.com" className="text-green-600 hover:underline font-medium">
                    info@malpinohdistro.com
                  </a>
                </div>
              </div>
            </div>
          </AnimatedCard>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <AnimatedCard delay={100}>
              <div className="glass-panel p-8 h-full">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <FileText className="mr-2 h-6 w-6 text-blue-600" />
                  Distribution Guide
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">Prepare Your Release</h3>
                    <p className="text-slate-600">
                      Ensure your audio files are in WAV format (16-bit, 44.1 kHz) and your cover art is a 
                      square JPEG or PNG image (3000x3000 pixels minimum).
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">Complete Metadata</h3>
                    <p className="text-slate-600">
                      Fill in all required fields including title, artist name, release date, and genre. 
                      Providing complete metadata helps your music reach the right audience.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">Processing Time</h3>
                    <p className="text-slate-600">
                      Processing times vary based on your plan. Our team will review your submission 
                      and proceed with distribution once approved.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
            
            <AnimatedCard delay={200}>
              <div className="glass-panel p-8 h-full">
                <h2 className="text-2xl font-semibold mb-6 flex items-center">
                  <HelpCircle className="mr-2 h-6 w-6 text-blue-600" />
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">How long does it take for my music to appear on platforms?</h3>
                    <p className="text-slate-600">
                      Processing times vary from 15-60 days depending on your subscription plan and the platforms selected.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">How do I withdraw my earnings?</h3>
                    <p className="text-slate-600">
                      You can request withdrawals through your Earnings dashboard. Provide your bank details and our team will process your payment.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2">Can I update my released music?</h3>
                    <p className="text-slate-600">
                      Some metadata can be updated after release. For audio file changes, you'll need to create a new release. Contact support for assistance.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default HelpCenter;
