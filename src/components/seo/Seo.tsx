import { Helmet } from 'react-helmet-async';
import { COMPANY, SITE_URL, organizationSchema, websiteSchema } from '@/lib/site';

export interface Crumb {
  name: string;
  path: string;
}

interface SeoProps {
  title: string;
  description: string;
  /** Route path, e.g. "/about". Used for canonical + og:url. */
  path: string;
  image?: string;
  type?: 'website' | 'article';
  keywords?: string;
  breadcrumbs?: Crumb[];
  /** Extra JSON-LD blocks for this page. */
  schemas?: Record<string, unknown>[];
  noindex?: boolean;
  /** Include the sitewide Organization + WebSite graph (homepage / about). */
  includeOrganization?: boolean;
}

const abs = (path: string) => `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;

const Seo = ({
  title,
  description,
  path,
  image = COMPANY.ogImage,
  type = 'website',
  keywords,
  breadcrumbs,
  schemas = [],
  noindex = false,
  includeOrganization = false,
}: SeoProps) => {
  const url = abs(path);

  const graph: Record<string, unknown>[] = [];
  if (includeOrganization) graph.push(organizationSchema, websiteSchema);
  if (breadcrumbs && breadcrumbs.length > 0) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path),
      })),
    });
  }
  graph.push(...schemas);

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex, nofollow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={COMPANY.name} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={COMPANY.twitterHandle} />

      {graph.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
