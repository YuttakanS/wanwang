import type { MetadataRoute } from 'next';

// /e/ stays crawlable on purpose: a crawler must fetch the page to see its X-Robots-Tag,
// and blocking it here would also break link previews on crawlers that obey robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
  };
}
