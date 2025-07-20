
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">About MALPINOHDISTRO</h1>
                <p className="text-slate-600">Your trusted partner for music distribution in Nigeria and beyond</p>
              </div>
              
              <div className="prose prose-slate max-w-none">
                <p className="text-lg">
                  MALPINOHDISTRO is a leading digital music distribution company based in Nigeria. We help independent artists and labels get their music on major streaming platforms and stores worldwide.
                </p>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
                <p>
                  Our mission is to empower African artists by providing affordable and reliable music distribution services, helping them reach global audiences while retaining their independence and rights.
                </p>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">Our Story</h2>
                <p>
                  Founded on June 7th, 2023, MALPINOHDISTRO was created to address the challenges faced by Nigerian and African artists in distributing their music globally. Our founder, ABDULKADIR IBRAHIM OLUWASHINA, saw the gap in affordable distribution services for local artists and created a solution that caters to the unique needs of the African music market.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-8">
                  <p className="italic">
                    "We believe every artist deserves a chance to be heard, regardless of their budget or resources. Our goal is to level the playing field and give African musicians the tools they need to succeed globally."
                  </p>
                  <p className="font-semibold mt-2">— ABDULKADIR IBRAHIM OLUWASHINA, Founder</p>
                </div>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">What Sets Us Apart</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Affordable distribution with transparent pricing</li>
                  <li>Specialized knowledge of African music markets</li>
                  <li>Personalized support for every artist</li>
                  <li>Fast turnaround times for releases</li>
                  <li>Clear reporting and timely payments</li>
                </ul>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">Our Partners</h2>
                <p>
                  We work with all major streaming platforms including Spotify, Apple Music, Audiomack, Boomplay, YouTube Music, and many more to ensure your music reaches the widest possible audience.
                </p>
                
                <div className="mt-10 text-center">
                  <h3 className="font-semibold text-xl mb-4">Ready to distribute your music?</h3>
                  <a href="/auth" className="btn-primary inline-block">Get Started Today</a>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
