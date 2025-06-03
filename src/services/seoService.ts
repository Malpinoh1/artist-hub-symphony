
export interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export const pagesSEO: Record<string, PageSEO> = {
  '/': {
    title: 'MALPINOHdistro - Global Music Distribution Service | Spotify, Apple Music & More',
    description: 'Distribute your music worldwide with MALPINOHdistro. Get on Spotify, Apple Music, Audiomack, Boomplay & 100+ platforms. Affordable pricing, fast delivery, Nigerian music distribution specialists.',
    keywords: 'music distribution, Nigeria, Spotify, Apple Music, Audiomack, Boomplay, independent artists, music streaming, digital distribution, music marketing, royalties',
    canonical: 'https://malpinohdistro.com.ng',
    priority: 1.0,
    changefreq: 'weekly'
  },
  '/auth': {
    title: 'Login | Register - MALPINOHdistro Artist Dashboard',
    description: 'Sign in to your MALPINOHdistro account to manage your music releases, track earnings, and distribute to streaming platforms worldwide.',
    keywords: 'login, register, artist dashboard, music distribution account',
    canonical: 'https://malpinohdistro.com.ng/auth',
    priority: 0.9,
    changefreq: 'monthly'
  },
  '/pricing': {
    title: 'Pricing Plans - Affordable Music Distribution | MALPINOHdistro',
    description: 'Choose the best music distribution plan for your needs. Transparent pricing, no hidden fees. Get your music on Spotify, Apple Music and 100+ platforms.',
    keywords: 'music distribution pricing, affordable plans, spotify distribution cost, apple music upload',
    canonical: 'https://malpinohdistro.com.ng/pricing',
    priority: 0.9,
    changefreq: 'monthly'
  },
  '/about': {
    title: 'About Us - MALPINOHdistro Music Distribution',
    description: 'Learn about MALPINOHdistro, our mission to help independent artists reach global audiences through major streaming platforms.',
    keywords: 'about malpinoh, music distribution company, independent artists support',
    canonical: 'https://malpinohdistro.com.ng/about',
    priority: 0.8,
    changefreq: 'monthly'
  },
  '/services': {
    title: 'Music Distribution Services | MALPINOHdistro',
    description: 'Comprehensive music distribution and marketing services. Get your music on streaming platforms, track analytics, and grow your fanbase.',
    keywords: 'music services, distribution, marketing, analytics, fan growth',
    canonical: 'https://malpinohdistro.com.ng/services',
    priority: 0.8,
    changefreq: 'monthly'
  },
  '/contact': {
    title: 'Contact Us - MALPINOHdistro Support',
    description: 'Get in touch with MALPINOHdistro support team. We are here to help with your music distribution needs and questions.',
    keywords: 'contact support, help, customer service, music distribution support',
    canonical: 'https://malpinohdistro.com.ng/contact',
    priority: 0.8,
    changefreq: 'monthly'
  },
  '/resources': {
    title: 'Artist Resources & Guides | MALPINOHdistro',
    description: 'Free resources for independent artists. Marketing guides, industry tips, and tools to help grow your music career.',
    keywords: 'artist resources, music marketing guides, industry tips, independent artist tools',
    canonical: 'https://malpinohdistro.com.ng/resources',
    priority: 0.8,
    changefreq: 'weekly'
  }
};

export const generateSitemap = (): string => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const urls = Object.entries(pagesSEO).map(([path, seo]) => `
  <url>
    <loc>https://malpinohdistro.com.ng${path === '/' ? '' : path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${seo.changefreq}</changefreq>
    <priority>${seo.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
};

export const getPageSEO = (path: string): PageSEO | null => {
  return pagesSEO[path] || null;
};
