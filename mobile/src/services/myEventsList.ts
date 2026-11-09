import type { AdminEventSummary } from '@/types';

/** SecureStore cannot list its keys, so this list is how the app finds the events it knows about. */
export interface KnownEvent {
  slug: string;
  title: string;
  hidden?: boolean;
}

export interface MyEvent extends KnownEvent {
  isAdmin: boolean;
  isClosed?: boolean;
  participantCount?: number;
}

export function parseKnownEvents(stored: string | null): KnownEvent[] {
  try {
    const parsed: unknown = JSON.parse(stored ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is KnownEvent => typeof e?.slug === 'string' && typeof e?.title === 'string');
  } catch {
    return [];
  }
}

/** Newest first. Using an event again lists it again, even if it was hidden. */
export function withKnownEvent(events: KnownEvent[], slug: string, title: string): KnownEvent[] {
  return [{ slug, title }, ...events.filter(e => e.slug !== slug)];
}

/**
 * The stored title covers events the lookup did not return: those the person only voted on, or
 * when the network failed. An event missing from a lookup is not removed here, because that alone
 * cannot tell a deleted event from one whose key changed.
 */
export function mergeMyEvents(known: KnownEvent[], adminSlugs: Set<string>, summaries: AdminEventSummary[]): MyEvent[] {
  const bySlug = new Map(summaries.map(summary => [summary.slug, summary]));
  return known.map(event => {
    const summary = bySlug.get(event.slug);
    return {
      ...event,
      title: summary?.title ?? event.title,
      isAdmin: adminSlugs.has(event.slug),
      isClosed: summary?.isClosed,
      participantCount: summary?.participantCount,
    };
  });
}
