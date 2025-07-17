
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ExternalLink, Music, Users, Globe } from 'lucide-react';

const Partners = () => {
  const platforms = [
    { name: "Spotify", description: "Global streaming leader", users: "456M+" },
    { name: "Apple Music", description: "Premium music service", users: "88M+" },
    { name: "YouTube Music", description: "Google's music platform", users: "80M+" },
    { name: "Amazon Music", description: "Amazon's streaming service", users: "55M+" },
    { name: "Deezer", description: "French streaming platform", users: "16M+" },
    { name: "Tidal", description: "High-fidelity streaming", users: "4M+" }
  ];

  const services = [
    {
      title: "Digital Distribution",
      description: "Get your music on all major streaming platforms worldwide",
      icon: <Globe className="w-8 h-8" />
    },
    {
      title: "Artist Development",
      description: "Tools and resources to grow your music career",
      icon: <Users className="w-8 h-8" />
    },
    {
      title: "Creative Services",
      description: "Professional mixing, mastering, and production support",
      icon: <Music className="w-8 h-8" />
    }
  ];

  return (
    <>
      <Helmet>
        <title>Partners - MALPINOHdistro | Our Distribution Network</title>
        <meta name="description" content="Discover our global network of streaming platforms and music industry partners." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Our Partners
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We work with the world's leading music platforms to get your music heard everywhere
              </p>
            </div>

            {/* Streaming Platforms */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12 animate-slide-up">
                Streaming Platforms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platforms.map((platform, index) => (
                  <div 
                    key={platform.name} 
                    className="glass-card p-6 text-center animate-scale-in hover:scale-105 transition-transform"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{platform.name}</h3>
                    <p className="text-muted-foreground mb-3">{platform.description}</p>
                    <div className="text-primary font-semibold">
                      {platform.users} active users
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Services */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12 animate-slide-up">
                Our Services
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {services.map((service, index) => (
                  <div 
                    key={service.title} 
                    className="glass-panel p-8 text-center animate-slide-up"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <div className="text-primary mb-4 flex justify-center">
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{service.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Partnership CTA */}
            <section className="text-center glass-panel p-8 animate-scale-in">
              <h2 className="text-3xl font-bold mb-4">
                Interested in Partnership?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                We're always looking to expand our network and create new opportunities for artists. 
                Get in touch to explore partnership possibilities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  className="btn-primary px-8 py-3 text-lg"
                >
                  Contact Us
                </a>
                <a 
                  href="mailto:partnerships@malpinoh.com.ng" 
                  className="btn-secondary px-8 py-3 text-lg flex items-center gap-2"
                >
                  partnerships@malpinoh.com.ng
                  <ExternalLink className="w-4 h-4" />
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

export default Partners;
