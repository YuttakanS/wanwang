'use client';

import React, { useState, useEffect, useCallback, useRef, use } from 'react';
import Navbar from '@/components/Navbar';
import ScheduleMatrix from '@/components/ScheduleMatrix';
import BestTimeLeaderboard from '@/components/BestTimeLeaderboard';
import EventShareBar from '@/components/EventShareBar';
import ParticipantsRoster from '@/components/ParticipantsRoster';
import AdminLinkNotice from '@/components/AdminLinkNotice';
import StatusPage from '@/components/StatusPage';
import SiteFooter from '@/components/SiteFooter';
import {
  clearAdminLinkPending,
  getStoredAdminKey,
  isAdminLinkPending,
  markAdminLinkPending,
  storeAdminKey,
  takeAdminKeyFromHash,
} from '@/lib/adminAccess';
import { WanWangEvent, Participant, EventCategory } from '@/types';
import { formatLocalizedDate, formatLocalizedDateRange } from '@/lib/timeUtils';
import { useI18n } from '@/lib/i18n';

class EventLoadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readEventResponse(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new EventLoadError(data?.error || '', res.status);
  return data;
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { lang, t } = useI18n();

  const [event, setEvent] = useState<WanWangEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [highlightSlotIds, setHighlightSlotIds] = useState<string[]>([]);
  const [showAdminNotice, setShowAdminNotice] = useState(false);
  const [adminLinkInvalid, setAdminLinkInvalid] = useState(false);
  const pendingAdminKeyRef = useRef<string | null>(null);

  const fetchEventData = useCallback(async () => {
    try {
      // Kept in a ref because reading the hash clears it, and a second call can
      // start before the first finishes (Strict Mode double-runs effects in dev).
      pendingAdminKeyRef.current = takeAdminKeyFromHash() ?? pendingAdminKeyRef.current;
      const linkKey = pendingAdminKeyRef.current;
      const storedKey = getStoredAdminKey(slug);

      const requestEvent = (adminKey: string | null) => {
        const headers: Record<string, string> = {};
        if (adminKey) {
          headers['x-admin-key'] = adminKey;
        }
        const myToken = typeof window !== 'undefined'
          ? localStorage.getItem(`wanwang_token_${slug}`)
          : null;
        if (myToken) {
          headers['x-edit-token'] = myToken;
        }
        return fetch(`/api/events/${slug}`, { headers, cache: 'no-store' });
      };

      let data = await readEventResponse(await requestEvent(linkKey || storedKey));

      if (linkKey) {
        pendingAdminKeyRef.current = null;
        if (data.isAdmin) {
          storeAdminKey(slug, linkKey);
          setAdminLinkInvalid(false);
        } else {
          setAdminLinkInvalid(true);
          // A bad link must not hide rights this browser already has.
          if (storedKey && storedKey !== linkKey) {
            data = await readEventResponse(await requestEvent(storedKey));
          }
        }
      }

      setLoadError(null);
      setEvent(data.event);
      setParticipants(data.participants || []);
      setIsAdmin(Boolean(data.isAdmin));
      setShowAdminNotice(Boolean(data.isAdmin) && isAdminLinkPending(slug));
    } catch (err: unknown) {
      setLoadError(
        err instanceof EventLoadError
          ? { status: err.status, message: err.message }
          : { status: 0, message: '' } // network failure
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchEventData();
    // Pasting an admin link into a tab already on this event only changes the hash.
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#admin=')) fetchEventData();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [fetchEventData]);

  // The new key goes through the same path as an admin link, so the refetch
  // still has admin rights even if localStorage is blocked and the save failed.
  const handleAdminKeyRotated = (newKey: string) => {
    storeAdminKey(slug, newKey);
    markAdminLinkPending(slug);
    pendingAdminKeyRef.current = newKey;
    fetchEventData();
  };

  const dismissAdminNotice = () => {
    clearAdminLinkPending(slug);
    setShowAdminNotice(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4 font-mono text-sm">
        <div className="border-3 border-black p-6 bg-white font-bold">
          LOADING...
        </div>
      </div>
    );
  }

  if ((!loadError && !event) || loadError?.status === 404) {
    return <StatusPage title={t('notFoundTitle')} description={t('notFoundDesc')} />;
  }

  if (loadError || !event) {
    return (
      <StatusPage
        title={t('errorTitle')}
        // The 429 message tells people to wait; other server messages are not written for users.
        description={(loadError?.status === 429 && loadError.message) || t('errorDesc')}
        onRetry={() => {
          setLoadError(null);
          setIsLoading(true);
          fetchEventData();
        }}
      />
    );
  }

  const getCategoryLabel = (id: EventCategory) => {
    switch (id) {
      case 'hangout': return t('catHangout');
      case 'trip': return t('catTrip');
      case 'sport': return t('catSport');
      case 'boardgame': return t('catBoardgame');
      case 'meeting': return t('catMeeting');
      default: return t('catGeneral');
    }
  };

  const catLabel = getCategoryLabel(event.category);
  const rangeStart = event.dateRangeStart || event.dates[0];
  const rangeEnd = event.dateRangeEnd || event.dates[event.dates.length - 1];
  const dateRangeStr = rangeStart && rangeEnd
    ? formatLocalizedDateRange(rangeStart, rangeEnd, lang)
    : '';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6 motion-stagger">
        {showAdminNotice && event.adminKey && (
          <AdminLinkNotice slug={slug} adminKey={event.adminKey} onDismiss={dismissAdminNotice} />
        )}

        {adminLinkInvalid && (
          <div className="p-3 bg-[#FFE500] border-3 border-black text-black font-mono text-xs motion-shake">
            [ERROR] {t('adminLinkInvalidMsg')}
          </div>
        )}

        {/* Pinned Confirmed Date Banner */}
        {event.confirmedDate && (
          <div className="bg-[#FFE500] border-4 border-black p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0_#000]">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">📌</span>
              <div>
                <span className="font-mono text-xs uppercase font-extrabold block text-black tracking-wider">
                  {t('pinnedBannerTitle')}
                </span>
                <span className="font-bold text-lg sm:text-xl text-black">
                  {formatLocalizedDate(event.confirmedDate, lang, 'chip')} {event.granularity === 'day' ? `(${t('allDayLabel')})` : ''}
                </span>
              </div>
            </div>
            <span className="font-mono text-xs uppercase px-3 py-1 bg-black text-[#FFE500] font-extrabold border-2 border-black self-start sm:self-center">
              {t('pinnedBadge')}
            </span>
          </div>
        )}

        {/* Event Header Banner (RawBlock 5px Border Card) */}
        <div className="bg-white border-5 border-black p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase px-2.5 py-1 border-2 border-black bg-black text-[#FFE500] font-bold">
              {catLabel}
            </span>

            {event.isClosed && (
              <span className="font-mono text-xs uppercase px-2.5 py-1 border-2 border-black bg-white text-black font-bold">
                {t('votingClosedBadge')}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-black leading-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-sm sm:text-base text-[#525252] max-w-2xl pt-1">
                {event.description}
              </p>
            )}
          </div>

          {/* Metas */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-3 font-mono text-xs text-black border-t-3 border-black font-bold">
            <div>
              {t('metaDatesLabel', { count: event.dates.length, range: dateRangeStr })}
            </div>

            <div>
              {event.granularity === 'day'
                ? t('metaFormatDay')
                : event.granularity === 'daypart'
                ? t('metaFormatDaypart')
                : t('metaFormatHour', { start: event.startTime || '09:00', end: event.endTime || '22:00' })}
            </div>

            {event.location && (
              <div>
                {t('metaLocationLabel', { loc: event.location })}
              </div>
            )}
          </div>

          <EventShareBar
            event={event}
            participants={participants}
            isAdmin={isAdmin}
            onEventUpdated={fetchEventData}
            onAdminKeyRotated={handleAdminKeyRotated}
          />
        </div>

        {/* Interactive Schedule Matrix & Voting */}
        <ScheduleMatrix
          event={event}
          participants={participants}
          onParticipantSaved={fetchEventData}
          highlightSlotIds={highlightSlotIds}
        />

        {/* Top Matches Leaderboard. A new array each time, so choosing a match again still scrolls to it. */}
        <BestTimeLeaderboard
          event={event}
          participants={participants}
          isAdmin={isAdmin}
          onEventUpdated={fetchEventData}
          onSelectMatch={slotIds => setHighlightSlotIds([...slotIds])}
          selectedSlotIds={highlightSlotIds}
        />

        {/* Participants Roster */}
        <ParticipantsRoster
          event={event}
          participants={participants}
          isAdmin={isAdmin}
          onParticipantDeleted={fetchEventData}
        />
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
