
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { HelpCircle, FileText, Phone, Mail, Instagram } from 'lucide-react';

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
                Find answers to common questions or get in touch with our support team.
              </p>
            </div>
          </AnimatedCard>
          
          {/* Common Questions */}
          <div className="mb-16">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-6">Common Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatedCard>
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-3">How do I distribute my music?</h3>
                  <p className="text-slate-600 mb-4">
                    After signing up, you can submit your music for distribution through your dashboard. 
                    Upload your audio files, cover art, and fill in all required metadata. Our team will review 
                    your submission and distribute it to all major platforms.
                  </p>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={100}>
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-3">When will I get paid?</h3>
                  <p className="text-slate-600 mb-4">
                    We collect royalties from streaming platforms monthly. Once your balance reaches the 
                    minimum withdrawal threshold (₦5,000), you can request a withdrawal through your dashboard. 
                    Payments are typically processed within 3-5 business days.
                  </p>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={200}>
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-3">What audio formats do you accept?</h3>
                  <p className="text-slate-600 mb-4">
                    We accept WAV files (16-bit, 44.1kHz) for the best quality. For cover art, we require 
                    JPG or PNG files with a minimum resolution of 3000x3000 pixels, square format.
                  </p>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={300}>
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-3">How do I track my performance?</h3>
                  <p className="text-slate-600 mb-4">
                    You can track your music performance through your dashboard. We provide analytics for 
                    streams, earnings, and audience demographics across all major platforms.
                  </p>
                </div>
              </AnimatedCard>
            </div>
          </div>
          
          {/* Contact Information */}
          <AnimatedCard>
            <div className="glass-panel p-8 mb-16">
              <h2 className="text-2xl font-semibold mb-6">Contact Us</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Phone className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Phone</h3>
                  <p className="text-slate-600">+234 7072218477</p>
                  <p className="text-slate-500 text-sm mt-2">Monday-Friday, 9am-5pm WAT</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Email</h3>
                  <p className="text-slate-600">support@malpinohdistro.com</p>
                  <p className="text-slate-500 text-sm mt-2">We'll respond within 24 hours</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                    <Instagram className="h-8 w-8 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Instagram</h3>
                  <a href="https://instagram.com/malpinohdistro" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@malpinohdistro</a>
                  <p className="text-slate-500 text-sm mt-2">Follow us for updates</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
          
          {/* Submit a Request */}
          <AnimatedCard>
            <div className="glass-panel p-8 mb-16">
              <h2 className="text-2xl font-semibold mb-6">Submit a Request</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      id="name" 
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Your email"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    id="subject" 
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="What is this regarding?"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea 
                    id="message" 
                    rows={6} 
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="How can we help you?"
                  ></textarea>
                </div>
                
                <div>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default HelpCenter;
