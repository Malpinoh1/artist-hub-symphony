import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  });
  return formatter.format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function generateInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function themeClass(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`;
}

export function generateMetaTags(title: string, description: string, keywords?: string, canonical?: string) {
  return {
    title: `${title} | MALPINOHdistro`,
    description,
    keywords: keywords || 'music distribution, streaming platforms, independent artists',
    canonical: canonical || 'https://malpinohdistro.com.ng',
    openGraph: {
      title: `${title} | MALPINOHdistro`,
      description,
      url: canonical || 'https://malpinohdistro.com.ng',
      siteName: 'MALPINOHdistro',
      type: 'website',
      image: 'https://malpinohdistro.com.ng/lovable-uploads/aa29dff4-6185-46f7-9ad6-48a114de8611.png'
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | MALPINOHdistro`,
      description,
      image: 'https://malpinohdistro.com.ng/lovable-uploads/aa29dff4-6185-46f7-9ad6-48a114de8611.png'
    }
  };
}

export function addStructuredData(type: 'WebPage' | 'Organization' | 'Service', data: any) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };
  
  return JSON.stringify(structuredData);
}
