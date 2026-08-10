// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { blogPosts } from '../src/data/blogPosts';

const BASE_URL = 'https://malpinohdistro.com.ng';

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.9' },
  { path: '/services', changefreq: 'monthly', priority: '0.9' },
  { path: '/distribution', changefreq: 'monthly', priority: '0.9' },
  { path: '/artists', changefreq: 'monthly', priority: '0.9' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.9' },
  { path: '/contact', changefreq: 'monthly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/resources', changefreq: 'weekly', priority: '0.7' },
  { path: '/resources/marketing-guide', changefreq: 'monthly', priority: '0.6' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/partners', changefreq: 'monthly', priority: '0.6' },
  { path: '/auth', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/copyright', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  // Published blog posts — lastmod comes from each post's own publication/update date.
  ...blogPosts.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.updated ?? post.date,
    changefreq: 'monthly' as const,
    priority: '0.7',
  })),
];

function generateSitemap(list: SitemapEntry[]) {
  const urls = list.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join('\n');
}

writeFileSync(resolve('public/sitemap.xml'), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
