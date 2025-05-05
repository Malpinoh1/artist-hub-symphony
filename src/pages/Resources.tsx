
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Download, FileText, Video, Book, Music, HelpCircle } from 'lucide-react';

const ResourceCard = ({ title, description, icon, link, external = false }) => {
  const CardContent = () => (
    <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="mb-4 rounded-full w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-slate-600 mb-4 flex-grow">{description}</p>
      <div className="mt-auto">
        {external ? (
          <span className="text-blue-600 font-medium inline-flex items-center">
            View Resource
            <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </span>
        ) : (
          <span className="text-blue-600 font-medium inline-flex items-center">
            View Resource
            <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  return external ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className="block h-full">
      <CardContent />
    </a>
  ) : (
    <Link to={link} className="block h-full">
      <CardContent />
    </Link>
  );
};

const Resources = () => {
  const resources = [
    {
      title: "Music Distribution Guide",
      description: "Learn everything about the music distribution process, from preparation to publishing.",
      icon: <FileText className="h-6 w-6" />,
      link: "/help",
    },
    {
      title: "Release Checklist",
      description: "A comprehensive checklist to ensure your release is ready for submission.",
      icon: <Download className="h-6 w-6" />,
      link: "https://drive.google.com/file/d/1example",
      external: true,
    },
    {
      title: "Cover Art Templates",
      description: "Download templates for creating professional cover art that meets platform requirements.",
      icon: <FileText className="h-6 w-6" />,
      link: "https://drive.google.com/file/d/1example2",
      external: true,
    },
    {
      title: "Music Marketing Guide",
      description: "Strategies and tips to effectively market your music after release.",
      icon: <Book className="h-6 w-6" />,
      link: "/resources/marketing",
    },
    {
      title: "Audio Mastering Tips",
      description: "Best practices for preparing your audio files for distribution.",
      icon: <Music className="h-6 w-6" />,
      link: "/resources/audio-tips",
    },
    {
      title: "Artist FAQ",
      description: "Answers to the most frequently asked questions by artists.",
      icon: <HelpCircle className="h-6 w-6" />,
      link: "/help",
    },
    {
      title: "Platform-Specific Requirements",
      description: "Detailed requirements for each streaming platform we distribute to.",
      icon: <FileText className="h-6 w-6" />,
      link: "/resources/platform-requirements",
    },
    {
      title: "Royalties Explained",
      description: "A comprehensive guide to understanding how music royalties work.",
      icon: <Book className="h-6 w-6" />,
      link: "/resources/royalties",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 mb-4">Artist Resources</h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Access guides, templates, and tools to help you succeed in your music career.
              </p>
            </div>
          </AnimatedCard>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {resources.map((resource, index) => (
              <AnimatedCard key={index} delay={index * 50}>
                <ResourceCard {...resource} />
              </AnimatedCard>
            ))}
          </div>
          
          <AnimatedCard delay={400}>
            <div className="glass-panel p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Need Personalized Support?</h2>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Our team is available to help you with specific questions or challenges you might face in your music career.
              </p>
              <Link 
                to="/contact" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Contact Our Support Team
              </Link>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Resources;
