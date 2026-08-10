import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import { blogPosts } from '@/data/blogPosts';
import { Calendar, User, ArrowRight } from 'lucide-react';

const Blog = () => {
  const posts = [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Seo
        title="Music Industry Blog | MALPINOHDISTRO"
        description="Guides on music distribution, royalties, release preparation and audience growth for independent artists — written by the MALPINOHDISTRO team."
        path="/blog"
        keywords="music distribution blog, royalties guide, independent artist tips, release checklist, music marketing"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'MALPINOHDISTRO Blog',
            url: `${COMPANY.url}/blog`,
            publisher: { '@id': `${COMPANY.url}/#organization` },
            blogPost: posts.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              description: p.excerpt,
              datePublished: p.date,
              dateModified: p.updated ?? p.date,
              author: { '@type': 'Organization', name: p.author },
              url: `${COMPANY.url}/blog/${p.slug}`,
            })),
          },
        ]}
      />

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <header className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary mb-3">RESOURCES</p>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Music industry blog
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Practical guides on distribution, royalties and growing a career as an independent
                artist.
              </p>
            </header>

            <div className="grid gap-6">
              {posts.map((post) => (
                <article key={post.slug} className="glass-card p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    <span className="text-muted-foreground text-sm">{post.readTime}</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    <Link to={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </h2>

                  <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </time>
                      </span>
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Read the full article
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <section className="text-center mt-12 glass-panel p-6">
              <h2 className="text-2xl font-semibold mb-4">Ready to release your music?</h2>
              <p className="text-muted-foreground mb-6">
                See how MALPINOHDISTRO delivers your music worldwide and reports every stream.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/distribution" className="btn-primary px-6 py-3">
                  How distribution works
                </Link>
                <Link
                  to="/contact"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  Contact us
                </Link>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Blog;
