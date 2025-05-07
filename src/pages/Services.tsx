import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Music, Globe, BarChart, DollarSign, MessageCircle, Shield } from 'lucide-react';

const ServiceCard = ({ icon, title, description }) => {
  return (
    <div className="glass-card p-6 flex flex-col items-start">
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 mb-4">{description}</p>
      <Link to="/auth" className="mt-auto text-blue-600 font-medium hover:text-blue-700">
        Learn more →
      </Link>
    </div>
  );
};

const PricingTier = ({ name, price, description, features, highlighted = false }) => {
  return (
    <div className={`rounded-xl overflow-hidden ${highlighted ? 'border-2 border-blue-500 shadow-lg shadow-blue-100' : 'border border-slate-200'}`}>
      {highlighted && (
        <div className="bg-blue-500 text-white text-center py-2 font-medium text-sm">
          MOST POPULAR
        </div>
      )}
      <div className={`p-6 ${highlighted ? 'bg-blue-50' : 'bg-white'}`}>
        <h3 className="text-xl font-semibold">{name}</h3>
        <div className="mt-4 mb-6">
          <span className="text-3xl font-bold">₦{price}</span>
          <span className="text-slate-500 ml-1">{description}</span>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <div className="mr-2 mt-0.5">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              {feature}
            </li>
          ))}
        </ul>
        <Link 
          to="/auth" 
          className={`block w-full py-3 px-4 rounded text-center font-medium ${
            highlighted 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
          }`}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};

const Services = () => {
  const services = [
    {
      icon: <Music className="w-7 h-7 text-blue-600" />,
      title: "Music Distribution",
      description: "Get your music on all major streaming platforms globally including Spotify, Apple Music, Boomplay, and more."
    },
    {
      icon: <Globe className="w-7 h-7 text-blue-600" />,
      title: "Fan Link Pages",
      description: "Custom landing pages that collect all your music streaming links in one place for easy sharing with fans."
    },
    {
      icon: <BarChart className="w-7 h-7 text-blue-600" />,
      title: "Streaming Analytics",
      description: "Track your performance across platforms with detailed analytics and insights about your listeners."
    },
    {
      icon: <DollarSign className="w-7 h-7 text-blue-600" />,
      title: "Royalty Collection",
      description: "We collect your streaming royalties from all platforms and provide transparent reporting and payments."
    },
    {
      icon: <MessageCircle className="w-7 h-7 text-blue-600" />,
      title: "Artist Support",
      description: "Dedicated support team to help with any questions about your releases, payments, or technical issues."
    },
    {
      icon: <Shield className="w-7 h-7 text-blue-600" />,
      title: "Rights Management",
      description: "We help protect your music through content ID systems and copyright registration services."
    }
  ];
  
  const pricingTiers = [
    {
      name: "Single Release",
      price: "5,000",
      description: "per release",
      features: [
        "Distribution to 10+ platforms",
        "Fan link page",
        "Keep 100% of rights",
        "Basic analytics",
        "60 days processing time",
        "Email support"
      ]
    },
    {
      name: "Pro Release",
      price: "8,000",
      description: "per release",
      highlighted: true,
      features: [
        "Distribution to 20+ platforms",
        "Premium fan link page",
        "Keep 100% of rights",
        "Advanced analytics",
        "30 days processing time",
        "Priority support",
        "Content ID for YouTube"
      ]
    },
    {
      name: "Album Package",
      price: "15,000",
      description: "up to 12 tracks",
      features: [
        "Distribution to all platforms",
        "Premium fan link page",
        "Keep 100% of rights",
        "Full analytics dashboard",
        "15 days processing time",
        "Priority support",
        "Content ID for YouTube",
        "Social media promotion"
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Services Header */}
          <AnimatedCard>
            <div className="text-center mb-16">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Our Services</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                MALPINOHdistro offers comprehensive music distribution and promotion services to help independent artists reach their audience and grow their career.
              </p>
            </div>
          </AnimatedCard>
          
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {services.map((service, index) => (
              <AnimatedCard key={index} delay={index * 100}>
                <ServiceCard {...service} />
              </AnimatedCard>
            ))}
          </div>
          
          {/* Pricing Section */}
          <AnimatedCard>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display font-semibold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Choose the plan that fits your needs. No hidden fees, no revenue shares, just straightforward pricing.
              </p>
            </div>
          </AnimatedCard>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {pricingTiers.map((tier, index) => (
              <AnimatedCard key={index} delay={index * 100}>
                <PricingTier {...tier} />
              </AnimatedCard>
            ))}
          </div>
          
          {/* Payment Info */}
          <AnimatedCard>
            <div className="glass-panel p-8 mb-16">
              <h2 className="text-2xl font-semibold mb-4">Payment Information</h2>
              <p className="mb-6">
                All payments should be made via bank transfer to our account. Once your payment is confirmed, we'll begin processing your release.
              </p>
              
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Account Name</h3>
                    <p className="font-semibold">ABDULKADIR IBRAHIM OLUWASHINA</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Account Number</h3>
                    <p className="font-semibold">8168940582</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Bank</h3>
                    <p className="font-semibold">OPAY DIGITAL BANK</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
          
          {/* FAQ */}
          <AnimatedCard>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
              </div>
              
              <div className="space-y-4">
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-2">How long does it take for my music to appear on streaming platforms?</h3>
                  <p className="text-slate-600">
                    Processing times vary by plan, but generally range from 15-60 days depending on the platforms and your selected service tier.
                  </p>
                </div>
                
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-2">Do you take a percentage of my royalties?</h3>
                  <p className="text-slate-600">
                    No, we don't take any percentage of your streaming royalties. You keep 100% of what your music earns after the initial distribution fee.
                  </p>
                </div>
                
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-2">What file formats do you accept for music uploads?</h3>
                  <p className="text-slate-600">
                    We accept WAV format (16 bit, 44.1kHz) for the best quality. We also accept high-quality MP3 files (320 kbps) if WAV is not available.
                  </p>
                </div>
                
                <div className="glass-panel p-6">
                  <h3 className="text-xl font-semibold mb-2">How do I get paid my royalties?</h3>
                  <p className="text-slate-600">
                    Royalties are collected and added to your MALPINOHdistro account. Once you reach the minimum withdrawal threshold, you can request a payout to your bank account from your dashboard.
                  </p>
                </div>
              </div>
              
              <div className="text-center mt-12">
                <Link to="/contact" className="btn-primary">
                  Have more questions? Contact us
                </Link>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Services;
