import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Music, 
  ChevronRight, 
  BarChart3, 
  Globe, 
  DollarSign, 
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';

// Testimonial data
const testimonials = [
  {
    quote: "MALPINOHdistro.com.ng helped me expand my audience globally. Their service is top-notch!",
    author: "Liolizzy",
    role: "Independent Artist"
  },
  {
    quote: "The best music distribution service for African artists. Easy to use and responsive support.",
    author: "Naijareins Studio",
    role: "Afrobeats Producer"
  },
  {
    quote: "I've tried other distributors, but none match the personal touch and care that MALPINOH provides.",
    author: "Shilex Crown",
    role: "Emerging Artist"
  }
];

// Feature data
const features = [
  {
    icon: <Music className="w-6 h-6 text-blue-600" />,
    title: "Worldwide Distribution",
    description: "Get your music on major streaming platforms like Spotify, Apple Music, Audiomack, Boomplay, and more."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
    title: "Artist Analytics",
    description: "Track your music performance with detailed analytics and insights to grow your audience."
  },
  {
    icon: <DollarSign className="w-6 h-6 text-blue-600" />,
    title: "Revenue Management",
    description: "Transparent earnings tracking and easy withdrawals to your local bank account."
  },
  {
    icon: <Globe className="w-6 h-6 text-blue-600" />,
    title: "Fan Link Pages",
    description: "Beautiful, customizable pages that showcase your music across all platforms in one place."
  }
];

// Platforms
const platforms = [
  { name: "Spotify", logo: "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png" },
  { name: "Apple Music", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Apple_Music_icon.svg/2048px-Apple_Music_icon.svg.png" },
  { name: "Audiomack", logo: "https://audiomack.com/static-assets/branding/audiomack-logo.png" },
  { name: "Boomplay", logo: "https://www.boomplaymusic.com/static/web/logo.png" },
  { name: "YouTube Music", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Youtube_Music_icon.svg/2048px-Youtube_Music_icon.svg.png" },
  { name: "Deezer", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Deezer_logo.svg/1280px-Deezer_logo.svg.png" },
];

const Index = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MALPINOHdistro",
    "url": "https://malpinohdistro.com.ng",
    "logo": "https://malpinohdistro.com.ng/logo.png",
    "description": "Global music distribution service for independent artists. Distribute your music to Spotify, Apple Music, and major streaming platforms worldwide.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+234-xxx-xxx-xxxx",
      "contactType": "Customer Support",
      "email": "support@malpinohdistro.com.ng"
    },
    "sameAs": [
      "https://instagram.com/malpinohdistro",
      "https://twitter.com/malpinohdistro",
      "https://facebook.com/malpinohdistro"
    ],
    "offers": {
      "@type": "Offer",
      "name": "Music Distribution Services",
      "description": "Distribute your music to major streaming platforms worldwide"
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>MALPINOHdistro - Global Music Distribution Service | Spotify, Apple Music & More</title>
        <meta name="description" content="Distribute your music worldwide with MALPINOHdistro. Get on Spotify, Apple Music, Audiomack, Boomplay & 100+ platforms. Affordable pricing, fast delivery, Nigerian music distribution specialists." />
        <meta name="keywords" content="music distribution, Nigeria, Spotify, Apple Music, Audiomack, Boomplay, independent artists, music streaming, digital distribution, music marketing, royalties" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://malpinohdistro.com.ng" />
        <meta property="og:title" content="MALPINOHdistro - Global Music Distribution Service" />
        <meta property="og:description" content="Distribute your music worldwide. Get on Spotify, Apple Music & 100+ platforms. Made for artists in Nigeria and beyond." />
        <meta property="og:image" content="https://malpinohdistro.com.ng/og-image.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://malpinohdistro.com.ng" />
        <meta property="twitter:title" content="MALPINOHdistro - Global Music Distribution Service" />
        <meta property="twitter:description" content="Distribute your music worldwide. Get on Spotify, Apple Music & 100+ platforms." />
        <meta property="twitter:image" content="https://malpinohdistro.com.ng/og-image.png" />

        {/* Additional SEO tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="MALPINOHdistro" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://malpinohdistro.com.ng" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>

        {/* Additional structured data for sitelinks */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "MALPINOHdistro",
            "url": "https://malpinohdistro.com.ng",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://malpinohdistro.com.ng/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            },
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": [
                {
                  "@type": "SiteNavigationElement",
                  "position": 1,
                  "name": "Login",
                  "description": "Sign in to your artist dashboard",
                  "url": "https://malpinohdistro.com.ng/auth"
                },
                {
                  "@type": "SiteNavigationElement",
                  "position": 2,
                  "name": "Pricing",
                  "description": "View our affordable music distribution plans",
                  "url": "https://malpinohdistro.com.ng/pricing"
                },
                {
                  "@type": "SiteNavigationElement",
                  "position": 3,
                  "name": "About",
                  "description": "Learn about MALPINOHdistro and our mission",
                  "url": "https://malpinohdistro.com.ng/about"
                },
                {
                  "@type": "SiteNavigationElement",
                  "position": 4,
                  "name": "Services",
                  "description": "Music distribution and marketing services",
                  "url": "https://malpinohdistro.com.ng/services"
                },
                {
                  "@type": "SiteNavigationElement",
                  "position": 5,
                  "name": "Contact",
                  "description": "Get in touch with our support team",
                  "url": "https://malpinohdistro.com.ng/contact"
                },
                {
                  "@type": "SiteNavigationElement",
                  "position": 6,
                  "name": "Resources",
                  "description": "Artist resources and guides",
                  "url": "https://malpinohdistro.com.ng/resources"
                }
              ]
            }
          })}
        </script>
      </Helmet>
      
      <Navbar />
      
      <main className="flex-grow pt-16">
        {/* Hero Section with improved SEO content */}
        <section className="py-16 sm:py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 -z-10"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 -z-10"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <AnimatedCard>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
                  GLOBAL MUSIC DISTRIBUTION SERVICE
                </span>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold text-slate-900 leading-tight mb-6">
                  Your Music, <span className="text-gradient">Everywhere</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                  Distribute your music to major streaming platforms worldwide with a personal touch. 
                  Get on Spotify, Apple Music, Audiomack, Boomplay and 100+ platforms. Made for artists in Nigeria and beyond.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth" className="btn-primary px-8 py-3 text-base" title="Sign up for music distribution">
                    Get Started - Login/Register
                  </Link>
                  <Link to="/pricing" className="btn-secondary px-8 py-3 text-base" title="View our distribution pricing plans">
                    View Pricing
                  </Link>
                </div>

                {/* Quick navigation links for SEO */}
                <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm" aria-label="Quick access">
                  <Link to="/about" className="text-blue-600 hover:underline" title="About MALPINOHdistro">About Us</Link>
                  <span className="text-slate-400">•</span>
                  <Link to="/services" className="text-blue-600 hover:underline" title="Music distribution services">Our Services</Link>
                  <span className="text-slate-400">•</span>
                  <Link to="/contact" className="text-blue-600 hover:underline" title="Contact support">Contact Support</Link>
                  <span className="text-slate-400">•</span>
                  <Link to="/resources" className="text-blue-600 hover:underline" title="Artist resources and guides">Artist Resources</Link>
                </nav>
              </AnimatedCard>
              
              <AnimatedCard delay={200}>
                <div className="mt-16 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none h-16 bottom-0 top-auto"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1619983081563-430f63602796?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=600&q=80" 
                    alt="Music Distribution Dashboard" 
                    className="rounded-2xl shadow-xl mx-auto transform hover:scale-[1.01] transition-transform duration-500 ease-out"
                  />
                  
                  <button className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors z-20">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                  </button>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </section>
        
        {/* Platforms Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <AnimatedCard>
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-slate-900 text-center mb-12">
                Distribute Your Music To The World's Top Platforms
              </h2>
              
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {platforms.map((platform, index) => (
                  <div 
                    key={index} 
                    className="w-24 md:w-32 h-16 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300"
                  >
                    <img 
                      src={platform.logo} 
                      alt={platform.name} 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <AnimatedCard>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                  Our Features
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">
                  Everything You Need To Succeed
                </h2>
                <p className="text-lg text-slate-600">
                  We provide all the tools and support you need to distribute your music effectively 
                  and build your career as an independent artist.
                </p>
              </div>
            </AnimatedCard>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <AnimatedCard key={index} delay={100 + index * 50} className="h-full">
                  <div className="glass-card p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 flex-grow">{feature.description}</p>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <AnimatedCard>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                  Simple Process
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-slate-600">
                  From upload to release, we make the distribution process simple and straightforward
                </p>
              </div>
            </AnimatedCard>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <AnimatedCard delay={100}>
                <div className="relative">
                  <div className="glass-card p-6 flex flex-col items-center text-center relative z-10">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <span className="text-2xl font-display font-bold text-blue-600">1</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-2">Create & Upload</h3>
                    <p className="text-slate-600">
                      Upload your music and cover art, add metadata and select your distribution platforms.
                    </p>
                  </div>
                  <div className="absolute top-1/2 left-full w-16 h-2 bg-blue-100 -translate-y-1/2 hidden md:block"></div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={150}>
                <div className="relative">
                  <div className="glass-card p-6 flex flex-col items-center text-center relative z-10">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <span className="text-2xl font-display font-bold text-blue-600">2</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-2">Review & Approve</h3>
                    <p className="text-slate-600">
                      We review your submission and process it for distribution to selected platforms.
                    </p>
                  </div>
                  <div className="absolute top-1/2 left-full w-16 h-2 bg-blue-100 -translate-y-1/2 hidden md:block"></div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={200}>
                <div className="glass-card p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <span className="text-2xl font-display font-bold text-blue-600">3</span>
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">Release & Earn</h3>
                  <p className="text-slate-600">
                    Your music goes live, fans listen, and you earn revenue that you can withdraw.
                  </p>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <AnimatedCard>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="inline-block px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium mb-4">
                  Success Stories
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-4">
                  What Our Artists Say
                </h2>
                <p className="text-lg text-slate-300">
                  Join hundreds of satisfied artists who are growing their careers with us
                </p>
              </div>
            </AnimatedCard>
            
            <div className="max-w-4xl mx-auto relative">
              <div className="glass-panel bg-slate-800/50 p-8 md:p-12">
                <div className="relative h-48">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-700 ${
                        index === currentTestimonial
                          ? 'opacity-100 transform translate-x-0'
                          : 'opacity-0 transform translate-x-20'
                      }`}
                    >
                      <div className="text-2xl md:text-3xl text-slate-100 italic font-serif mb-8">
                        "{testimonial.quote}"
                      </div>
                      <div>
                        <div className="font-medium text-white">{testimonial.author}</div>
                        <div className="text-slate-400 text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center mt-8">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-3 h-3 rounded-full mx-1 transition-colors ${
                        index === currentTestimonial ? 'bg-blue-500' : 'bg-slate-600'
                      }`}
                      aria-label={`View testimonial ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <AnimatedCard>
                <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
                  Ready to Share Your Music with the World?
                </h2>
                <p className="text-xl text-blue-100 mb-10">
                  Join MALPINOHdistro today and take your music career to the next level
                </p>
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3 rounded-full text-lg font-medium hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  Get Started Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </AnimatedCard>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
