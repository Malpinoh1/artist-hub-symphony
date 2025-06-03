
export const googleSearchConsoleSteps = [
  {
    step: 1,
    title: "Verify Your Domain",
    description: "Go to Google Search Console (https://search.google.com/search-console) and add your property: malpinohdistro.com.ng",
    action: "Add a DNS TXT record or upload HTML file to verify ownership"
  },
  {
    step: 2,
    title: "Submit Your Sitemap",
    description: "Once verified, submit your sitemap URL in Search Console",
    action: "Go to Sitemaps > Add new sitemap > Enter: https://malpinohdistro.com.ng/sitemap.xml"
  },
  {
    step: 3,
    title: "Request Indexing for Priority Pages",
    description: "Use URL Inspection tool to request immediate indexing",
    action: "Search for each URL and click 'Request Indexing' for: /auth, /pricing, /about, /services, /contact, /resources"
  },
  {
    step: 4,
    title: "Monitor Performance",
    description: "Check indexing status and search performance regularly",
    action: "Use Coverage report to see which pages are indexed and Performance report to track clicks"
  }
];

export const priorityPagesForIndexing = [
  "https://malpinohdistro.com.ng/auth",
  "https://malpinohdistro.com.ng/pricing", 
  "https://malpinohdistro.com.ng/about",
  "https://malpinohdistro.com.ng/services",
  "https://malpinohdistro.com.ng/contact",
  "https://malpinohdistro.com.ng/resources"
];

export const getIndexingInstructions = () => {
  return `
🚀 FAST INDEXING SETUP GUIDE

1. **IMMEDIATE ACTION REQUIRED:**
   - Visit: https://search.google.com/search-console
   - Add property: malpinohdistro.com.ng
   - Verify ownership (DNS or HTML method)

2. **SUBMIT SITEMAP:**
   - URL: https://malpinohdistro.com.ng/sitemap.xml
   - This helps Google discover all your pages

3. **REQUEST PRIORITY INDEXING:**
   Use URL Inspection tool for these pages:
   ${priorityPagesForIndexing.map(url => `   - ${url}`).join('\n')}

4. **EXPECTED TIMELINE:**
   - Priority pages: 24-48 hours after manual request
   - All pages: 1-2 weeks with sitemap
   - Without this setup: 2-4 weeks or longer

5. **BONUS TIPS:**
   - Set up Google Analytics 4 for better insights
   - Create Google My Business if applicable
   - Build quality backlinks to speed up discovery
  `;
};
