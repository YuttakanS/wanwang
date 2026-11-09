import type { Metadata } from 'next';
import { getEventBySlug } from '@/lib/db';
import { EVENT_DESCRIPTION, OPEN_GRAPH_BASE, TWITTER_BASE } from '@/lib/siteMetadata';

// Only the title goes into link previews: chat apps may keep them after the event is purged.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getEventBySlug(slug);
    if (!event) return {};

    return {
      title: event.title,
      description: EVENT_DESCRIPTION,
      openGraph: { ...OPEN_GRAPH_BASE, title: event.title, description: EVENT_DESCRIPTION },
      twitter: { ...TWITTER_BASE, title: event.title, description: EVENT_DESCRIPTION },
    };
  } catch (err) {
    console.error('Event metadata error:', err);
    return {};
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
