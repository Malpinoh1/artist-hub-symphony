
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Music, 
  Globe, 
  DollarSign, 
  BarChart3, 
  Shield, 
  Zap,
  Play,
  Users,
  Star,
  CheckCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { SiteNoticePopup } from '@/components/SiteNoticePopup';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Distribution",
      description: "Get your music on 150+ streaming platforms worldwide including Spotify, Apple Music, and YouTube Music."
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Keep 100% Royalties",
      description: "No hidden fees or commission cuts. Keep all your earnings from streams and downloads."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Track your performance with detailed insights, fan demographics, and streaming statistics."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Content Protection",
      description: "Comprehensive copyright protection and content ID to safeguard your intellectual property."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Fast Distribution",
      description: "Get your music live on platforms within 24-48 hours with our streamlined process."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description: "Invite team members and manage multi-user access with role-based permissions."
    }
  ];

  const platforms = [
    "Spotify", "Apple Music", "YouTube Music", "Amazon Music", "Deezer", "Tidal",
    "Pandora", "SoundCloud", "Shazam", "TikTok", "Instagram", "Facebook"
  ];

  const testimonials = [
    {
      name: "Alex Johnson",
      role: "Independent Artist",
      content: "MALPINOHdistro made it incredibly easy to get my music everywhere. The analytics help me understand my audience better.",
      rating: 5
    },
    {
      name: "Sarah Chen",
      role: "Record Label Owner",
      content: "The team collaboration features are game-changing. We can manage multiple artists efficiently with role-based access.",
      rating: 5
    },
    {
      name: "Marcus Williams",
      role: "Producer",
      content: "Fast distribution and excellent customer support. My tracks were live on all platforms within hours.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <SiteNoticePopup />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <Star className="w-4 h-4 mr-2 fill-current" />
                  Trusted by 10,000+ Artists
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
                  Distribute Your Music
                  <span className="block text-gradient">Globally</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                  Get your music on every major streaming platform worldwide. 
                  Keep 100% of your royalties with our industry-leading distribution service.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 animate-glow"
                  asChild
                >
                  <Link to="/auth">
                    Start Distributing
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 border-2"
                  asChild
                >
                  <Link to="/pricing">
                    <Play className="mr-2 w-5 h-5" />
                    See Pricing
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No upfront costs
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Keep 100% royalties
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  24/7 support
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="relative animate-float">
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/20" />
                <div className="relative z-10">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {platforms.slice(0, 6).map((platform, index) => (
                      <div key={platform} className="text-center p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                        <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
                        <div className="text-xs font-medium">{platform}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">150+</div>
                    <div className="text-sm text-muted-foreground">Streaming Platforms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need to <span className="text-gradient">Succeed</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and features you need 
              to distribute, promote, and monetize your music effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={feature.title} delay={index * 100}>
                <Card className="glass-card h-full group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      {React.cloneElement(feature.icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Available on <span className="text-gradient">All Major Platforms</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Reach your audience wherever they listen. We distribute to all the platforms that matter.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {platforms.map((platform, index) => (
              <AnimatedCard key={platform} delay={index * 50}>
                <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
                  <Music className="w-8 h-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <div className="font-medium text-sm">{platform}</div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Loved by <span className="text-gradient">Artists Worldwide</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See what artists are saying about their experience with MALPINOHdistro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <AnimatedCard key={testimonial.name} delay={index * 100}>
                <Card className="glass-card h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedCard>
            <div className="glass-card p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Ready to Share Your Music with the World?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of artists who trust MALPINOHdistro to distribute their music globally. 
                  Start your journey today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    asChild
                  >
                    <Link to="/auth">
                      Get Started Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-lg px-8 py-6 border-2"
                    asChild
                  >
                    <Link to="/contact">
                      Contact Sales
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
