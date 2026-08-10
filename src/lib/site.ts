/**
 * Single source of truth for public-facing company data used in SEO,
 * structured data and page copy. Only verified information belongs here.
 */

export const SITE_URL = 'https://malpinohdistro.com.ng';

export const COMPANY = {
  name: 'MALPINOHDISTRO',
  legalName: 'MALPINOHDISTRO',
  alternateName: 'MALPINOHdistro',
  url: SITE_URL,
  companyProfileUrl: 'https://cprofile.malpinohdistro.com.ng/',
  logo: `${SITE_URL}/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png`,
  ogImage: `${SITE_URL}/og-image.png`,
  email: 'admin@malpinohdistro.com.ng',
  founder: 'Abdulkadir Ibrahim Oluwashina',
  foundingDate: '2023-06-07',
  areaServed: 'Worldwide',
  location: 'Lagos, Nigeria',
  addressCountry: 'NG',
  twitterHandle: '@malpinohdistro',
  description:
    'MALPINOHDISTRO is an independent digital music distribution company and artist platform. We work with third-party music aggregators and distribution partners to deliver releases from independent artists and labels to digital streaming platforms worldwide, with royalty reporting, analytics and artist support built in.',
  sameAs: [
    'https://cprofile.malpinohdistro.com.ng/',
    'https://instagram.com/malpinohdistro',
    'https://twitter.com/malpinohdistro',
    'https://facebook.com/malpinohdistro',
  ],
} as const;

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: COMPANY.name,
  legalName: COMPANY.legalName,
  alternateName: COMPANY.alternateName,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: COMPANY.logo,
  },
  image: COMPANY.ogImage,
  description: COMPANY.description,
  email: COMPANY.email,
  foundingDate: COMPANY.foundingDate,
  founder: {
    '@type': 'Person',
    name: COMPANY.founder,
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lagos',
    addressCountry: COMPANY.addressCountry,
  },
  areaServed: COMPANY.areaServed,
  knowsAbout: [
    'Music distribution',
    'Digital streaming platforms',
    'Music royalties',
    'Independent artists',
    'Label services',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: COMPANY.email,
      availableLanguage: ['English'],
      areaServed: 'Worldwide',
    },
  ],
  sameAs: [...COMPANY.sameAs],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: COMPANY.name,
  alternateName: COMPANY.alternateName,
  url: SITE_URL,
  description: COMPANY.description,
  inLanguage: 'en',
  publisher: { '@id': `${SITE_URL}/#organization` },
};
