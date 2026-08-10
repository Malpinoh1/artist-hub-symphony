import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { COMPANY } from '@/lib/site';
import { getPostBySlug, blogPosts } from '@/data/blogPosts';
import { Calendar, User, Clock, ArrowLeft } from 'lucide-react';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const published = new Date(post.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <Seo
        title={`${post.title} | MALPINOHDISTRO`}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        keywords={`${post.category.toLowerCase()}, music distribution, independent artists, MALPINOHDISTRO`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
        schemas={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            dateModified: post.updated ?? post.date,
            author: { '@type': 'Organization', name: post.author, url: COMPANY.url },
            publisher: { '@id': `${COMPANY.url}/#organization` },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${COMPANY.url}/blog/${post.slug}`,
            },
            articleSection: post.category,
            inLanguage: 'en',
            image: COMPANY.ogImage,
          },
        ]}
      />

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> All articles
            </Link>

            <article>
              <header className="mb-8">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {post.category}
                </span>
                <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-4">{post.title}</h1>
                <p className="text-lg text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" /> {post.author}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={post.date}>{published}</time>
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {post.readTime}
                  </span>
                </div>
              </header>

              <div className="space-y-8">
                {post.body.map((section, i) => (
                  <section key={i}>
                    {section.heading && (
                      <h2 className="text-2xl font-semibold mb-3">{section.heading}</h2>
                    )}
                    <div className="space-y-4">
                      {section.paragraphs.map((p, j) => (
                        <p key={j} className="text-muted-foreground leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <section className="glass-panel p-6 mt-12 text-center">
              <h2 className="text-xl font-semibold mb-3">Distribute your music with us</h2>
              <p className="text-muted-foreground mb-5">
                Deliver to 150+ platforms with transparent royalty reporting.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/auth" className="btn-primary px-6 py-3">
                  Get started
                </Link>
                <Link
                  to="/pricing"
                  className="px-6 py-3 rounded-lg border border-border font-medium hover:bg-secondary transition-colors"
                >
                  View pricing
                </Link>
              </div>
            </section>

            {related.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-semibold mb-4">Keep reading</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      to={`/blog/${r.slug}`}
                      className="glass-card p-5 hover:border-primary/40 transition-colors"
                    >
                      <p className="text-xs text-primary mb-2">{r.category}</p>
                      <p className="font-medium leading-snug">{r.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BlogPost;
