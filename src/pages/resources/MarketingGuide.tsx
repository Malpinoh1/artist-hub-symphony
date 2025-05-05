
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AnimatedCard from '../../components/AnimatedCard';

const MarketingGuide = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="mb-6">
              <Link to="/resources" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Resources
              </Link>
            </div>
          </AnimatedCard>
          
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Music Marketing Guide</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Effective strategies to promote your music and grow your audience
              </p>
            </div>
          </AnimatedCard>
          
          <AnimatedCard>
            <div className="glass-panel p-8 prose prose-slate max-w-none">
              <h2>Pre-Release Marketing</h2>
              <p>
                Building anticipation before your release is crucial for a successful launch. Start marketing your music 
                2-4 weeks before the release date.
              </p>
              <ul>
                <li>Create teaser content like short clips or behind-the-scenes footage</li>
                <li>Set up a pre-save campaign to boost day-one streams</li>
                <li>Reach out to playlist curators and music blogs for placements</li>
                <li>Engage with your existing audience through email and social media</li>
              </ul>
              
              <h2>Release Day Strategy</h2>
              <p>
                The first 24-48 hours after your release are critical for algorithmic performance.
              </p>
              <ul>
                <li>Post across all your social media platforms</li>
                <li>Email your fan list with direct streaming links</li>
                <li>Consider hosting a release event (virtual or in-person)</li>
                <li>Ask friends and family to share your release</li>
              </ul>
              
              <h2>Post-Release Promotion</h2>
              <p>
                Maintaining momentum after release day is essential for long-term success.
              </p>
              <ul>
                <li>Create content from your music (visualizers, lyric videos)</li>
                <li>Run targeted social media ads to potential fans</li>
                <li>Collaborate with other artists for cross-promotion</li>
                <li>Analyze streaming data to understand your audience better</li>
              </ul>
              
              <h2>Social Media Best Practices</h2>
              <p>
                Each platform requires a different approach for optimal engagement.
              </p>
              <ul>
                <li>Instagram: Focus on visual content, Stories, and Reels</li>
                <li>TikTok: Create trend-based short clips featuring your music</li>
                <li>Twitter: Engage directly with fans and industry figures</li>
                <li>Facebook: Target older demographics and create community groups</li>
              </ul>
              
              <h2>Building Your Artist Brand</h2>
              <p>
                A consistent brand helps fans recognize and connect with your music.
              </p>
              <ul>
                <li>Develop a unique visual identity across all platforms</li>
                <li>Create a compelling artist story and narrative</li>
                <li>Identify your unique selling points as an artist</li>
                <li>Be authentic and consistent in your communication</li>
              </ul>
              
              <h2>Budget-Friendly Marketing Ideas</h2>
              <p>
                You don't need a large budget to effectively promote your music.
              </p>
              <ul>
                <li>Leverage user-generated content by engaging with fans</li>
                <li>Join online music communities and contribute value</li>
                <li>Exchange shout-outs with other emerging artists</li>
                <li>Create behind-the-scenes content that fans love</li>
              </ul>
              
              <h2>Measuring Success</h2>
              <p>
                Track key performance indicators to understand what's working.
              </p>
              <ul>
                <li>Stream counts across platforms</li>
                <li>Social media engagement metrics</li>
                <li>Playlist additions and saves</li>
                <li>Growth in followers and email subscribers</li>
              </ul>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mt-8">
                <h3 className="text-blue-800 font-medium mb-2">Need Personalized Marketing Advice?</h3>
                <p className="text-blue-700">
                  Our team can help you develop a customized marketing strategy for your music. 
                  <Link to="/contact" className="text-blue-600 font-medium hover:underline ml-1">Contact us</Link> to learn more.
                </p>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MarketingGuide;
