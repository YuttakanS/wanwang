'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ScheduleMatrix from '@/components/ScheduleMatrix';
import BestTimeLeaderboard from '@/components/BestTimeLeaderboard';
import EventShareBar from '@/components/EventShareBar';
import ParticipantsRoster from '@/components/ParticipantsRoster';
import { WanWangEvent, Participant, EVENT_CATEGORIES, EventCategory } from '@/types';
import { formatLocalizedDate } from '@/lib/timeUtils';
import { useI18n } from '@/lib/i18n';

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
  const [errorMsg, setErrorMsg] = useState('');
  const [highlightSlotIds, setHighlightSlotIds] = useState<string[]>([]);

  const fetchEventData = useCallback(async () => {
    try {
      const adminKey = typeof window !== 'undefined'
        ? localStorage.getItem(`wanwang_admin_${slug}`) || ''
        : '';

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

      const res = await fetch(`/api/events/${slug}`, {
        headers,
        cache: 'no-store',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load event');
      }

      setEvent(data.event);
      setParticipants(data.participants || []);
      setIsAdmin(Boolean(data.isAdmin || adminKey));
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'FAILED TO LOAD EVENT DATA');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4 font-mono text-sm">
        <div className="border-3 border-black p-6 bg-white font-bold">
          LOADING...
        </div>
      </div>
    );
  }

  if (errorMsg || !event) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Navbar />
        <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
          <div className="border-3 border-black p-6 bg-white space-y-3">
            <h2 className="text-xl font-bold">{t('notFoundTitle')}</h2>
            <p className="text-xs text-[#525252]">{errorMsg || t('notFoundDesc')}</p>
            <Link
              href="/"
              className="btn-primary-raw px-4 py-2 text-xs"
            >
              {t('returnHomeBtn')}
            </Link>
          </div>
        </div>
      </div>
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
    ? `${formatLocalizedDate(rangeStart, lang, 'chip')} - ${formatLocalizedDate(rangeEnd, lang, 'chip')}`
    : '';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
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
        </div>

        {/* 1-Click Share & LINE Bar */}
        <EventShareBar
          event={event}
          participants={participants}
          isAdmin={isAdmin}
          onEventUpdated={fetchEventData}
        />

        {/* Top Matches Leaderboard */}
        <BestTimeLeaderboard
          event={event}
          participants={participants}
          isAdmin={isAdmin}
          onEventUpdated={fetchEventData}
          onSelectMatch={slotIds => setHighlightSlotIds(slotIds)}
          selectedSlotIds={highlightSlotIds}
        />

        {/* Interactive Schedule Matrix & Voting */}
        <ScheduleMatrix
          event={event}
          participants={participants}
          isAdmin={isAdmin}
          onParticipantSaved={fetchEventData}
          highlightSlotIds={highlightSlotIds}
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
      <footer className="border-t-3 border-black py-6 text-center font-mono text-xs text-[#525252] mt-12 bg-white">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}
