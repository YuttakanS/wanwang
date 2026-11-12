'use client';

import { Analytics } from '@vercel/analytics/next';
import { scrubAnalyticsUrl } from '@/lib/analyticsUrl';

/** Page view counts for the owner. The address is scrubbed first, see scrubAnalyticsUrl. */
export default function WebAnalytics() {
  return <Analytics beforeSend={event => ({ ...event, url: scrubAnalyticsUrl(event.url) })} />;
}
