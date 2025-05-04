
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Check } from 'lucide-react';

const PricingTier = ({ name, price, description, features, link = "/auth", highlighted = false }) => {
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
              <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link 
          to={link} 
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

const Pricing = () => {
  const pricingTiers = [
    {
      name: "Pay Per Release",
      price: "20,000",
      description: "per release",
      features: [
        "Distribution to all major platforms",
        "Fan link page",
        "Keep 100% of rights",
        "Basic analytics",
        "60 days processing time",
        "Email support"
      ]
    },
    {
      name: "Yearly Subscription",
      price: "55,000",
      description: "per year",
      highlighted: true,
      features: [
        "Distribution to all major platforms",
        "Premium fan link page",
        "Keep 100% of rights",
        "Advanced analytics",
        "30 days processing time",
        "Priority support",
        "Content ID for YouTube",
        "Up to 10 releases per year"
      ]
    },
    {
      name: "Unlimited Artists",
      price: "100 USD",
      description: "equivalent in Naira",
      features: [
        "Everything in Yearly Subscription",
        "Unlimited artists",
        "Unlimited releases",
        "15 days priority processing",
        "Premium support",
        "Content ID for YouTube",
        "Social media promotion",
        "Dedicated account manager"
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
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
          
          <AnimatedCard>
            <div className="glass-panel p-8 mb-16">
              <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">How do the pricing plans work?</h3>
                  <p className="text-slate-600">
                    Our pricing is designed to be flexible based on your needs. Pay per release for occasional distributions, 
                    yearly subscription for regular releases, or unlimited for agencies and labels managing multiple artists.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Do you take any percentage of my earnings?</h3>
                  <p className="text-slate-600">
                    No, you keep 100% of your streaming royalties. We only charge the upfront fee for our distribution services.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">How long does it take for my music to appear on streaming platforms?</h3>
                  <p className="text-slate-600">
                    Processing times vary by plan, generally ranging from 15-60 days depending on your selected service tier.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">What's the process after I make a payment?</h3>
                  <p className="text-slate-600">
                    After payment confirmation, you'll receive access to upload your music and artwork through our platform. 
                    Our team will verify everything meets the requirements and begin the distribution process.
                  </p>
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

export default Pricing;
