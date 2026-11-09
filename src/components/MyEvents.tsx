'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getHiddenSlugs,
  hideMyEvent,
  listStoredAdminKeys,
  unhideAllMyEvents,
} from '@/lib/adminAccess';
import { useI18n } from '@/lib/i18n';
import { AdminEventSummary, MAX_ADMIN_LOOKUP } from '@/types';

async function fetchSummaries(items: { slug: string; adminKey: string }[]): Promise<AdminEventSummary[]> {
  const chunks: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += MAX_ADMIN_LOOKUP) {
    chunks.push(items.slice(i, i + MAX_ADMIN_LOOKUP));
  }

  const results = await Promise.all(
    chunks.map(async chunk => {
      try {
        const res = await fetch('/api/events/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk }),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.events || []) as AdminEventSummary[];
      } catch {
        return [];
      }
    })
  );

  return results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Events created in this browser. A failed lookup may be temporary, so stored
 *  keys are never removed here; those events are just not shown. */
export default function MyEvents() {
  const { t } = useI18n();
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);

  const load = useCallback(async () => {
    const stored = listStoredAdminKeys();
    const hidden = new Set(getHiddenSlugs());
    setHiddenCount(stored.filter(k => hidden.has(k.slug)).length);
    return fetchSummaries(stored.filter(k => !hidden.has(k.slug)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(result => {
      if (!cancelled) setEvents(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleHide = (slug: string) => {
    hideMyEvent(slug);
    setEvents(prev => prev.filter(e => e.slug !== slug));
    setHiddenCount(prev => prev + 1);
  };

  const handleShowHidden = async () => {
    unhideAllMyEvents();
    setEvents(await load());
  };

  if (events.length === 0 && hiddenCount === 0) return null;

  return (
    <section className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-3 motion-enter">
      <div className="border-b-3 border-ink pb-3">
        <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">
          {t('myEventsTitle')}
        </h2>
        <p className="text-sm text-muted mt-0.5">{t('myEventsSubtitle')}</p>
      </div>

      {events.length > 0 && (
        <ul className="divide-y-3 divide-ink">
          {events.map(event => (
            <li key={event.slug} className="py-3 flex items-center justify-between gap-3">
              <Link
                href={`/e/${encodeURIComponent(event.slug)}`}
                className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:underline"
              >
                <span className="font-bold text-base text-ink break-words min-w-0">{event.title}</span>
                <span className="font-mono text-xs text-muted shrink-0">
                  {t('myEventsResponses', { count: event.participantCount })}
                  {event.isClosed && ` • ${t('votingClosedBadge')}`}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => handleHide(event.slug)}
                aria-label={t('myEventsHideLabel', { title: event.title })}
                className="px-2 py-1 bg-surface hover:bg-ink hover:text-surface border-2 border-ink font-mono text-xs shrink-0 cursor-pointer transition-none"
              >
                {t('myEventsHideBtn')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleShowHidden}
          className="text-xs text-ink underline cursor-pointer"
        >
          {t('myEventsShowHidden', { count: hiddenCount })}
        </button>
      )}
    </section>
  );
}
