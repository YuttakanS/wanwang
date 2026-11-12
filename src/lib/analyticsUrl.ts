/**
 * What a page view may tell the analytics service about the address.
 * An event's slug is the only thing that guards it, and an admin link carries the key
 * in its fragment, so neither may leave the browser. No page reads a query string,
 * so that is dropped too.
 */
export function scrubAnalyticsUrl(url: string): string {
  const path = url.split('#')[0].split('?')[0];
  return path.replace(/\/e\/[^/]+/, '/e/[slug]');
}
