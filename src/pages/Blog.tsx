
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Calendar, User, ArrowRight } from 'lucide-react';

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "The Future of Music Distribution in 2024",
      excerpt: "Explore the latest trends and technologies shaping how independent artists distribute their music globally.",
      author: "MALPINOHdistro Team",
      date: "2024-01-15",
      readTime: "5 min read",
      category: "Industry Insights"
    },
    {
      id: 2,
      title: "Maximizing Your Streaming Revenue: A Complete Guide",
      excerpt: "Learn proven strategies to increase your streaming numbers and maximize revenue from your music releases.",
      author: "Sarah Johnson",
      date: "2024-01-10",
      readTime: "8 min read",
      category: "Marketing"
    },
    {
      id: 3,
      title: "Understanding Music Rights and Royalties",
      excerpt: "A comprehensive breakdown of different types of music rights and how royalties work in the streaming era.",
      author: "Michael Chen",
      date: "2024-01-05",
      readTime: "6 min read",
      category: "Education"
    },
    {
      id: 4,
      title: "Building Your Artist Brand on Social Media",
      excerpt: "Essential tips for creating a strong online presence and connecting with your audience across platforms.",
      author: "Emma Rodriguez",
      date: "2023-12-28",
      readTime: "7 min read",
      category: "Marketing"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Blog - MALPINOHdistro | Music Industry Insights</title>
        <meta name="description" content="Stay updated with the latest music industry trends, distribution tips, and artist resources." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Music Industry Blog
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Insights, tips, and resources for independent artists
              </p>
            </div>

            <div className="grid gap-8 md:gap-10">
              {blogPosts.map((post, index) => (
                <article 
                  key={post.id} 
                  className="glass-card p-6 md:p-8 animate-slide-up hover:scale-[1.02] transition-transform cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                          {post.category}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {post.readTime}
                        </span>
                      </div>
                      
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      
                      <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{post.author}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(post.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <button className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
                          Read More
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="text-center mt-12 glass-panel p-6 animate-scale-in">
              <h2 className="text-2xl font-semibold mb-4">Want to contribute?</h2>
              <p className="text-muted-foreground mb-6">
                Share your music industry insights with our community of independent artists.
              </p>
              <a 
                href="/contact" 
                className="btn-primary px-8 py-3 text-lg"
              >
                Submit Article
              </a>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Blog;
