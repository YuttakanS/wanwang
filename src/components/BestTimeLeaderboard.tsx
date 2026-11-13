'use client';

import React, { useMemo, useState } from 'react';
import { WanWangEvent, Participant } from '@/types';
import { findBestTimeMatches } from '@/lib/timeUtils';
import { useI18n } from '@/lib/i18n';

interface BestTimeLeaderboardProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin?: boolean;
  onEventUpdated?: () => void;
  onSelectMatch?: (slotIds: string[]) => void;
  selectedSlotIds?: string[];
}

export default function BestTimeLeaderboard({
  event,
  participants,
  isAdmin = false,
  onEventUpdated,
  onSelectMatch,
  selectedSlotIds = [],
}: BestTimeLeaderboardProps) {
  const { lang, t } = useI18n();
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState('');

  // Retrieve matches sorted by available count descending
  const bestMatches = useMemo(
    () => findBestTimeMatches(event, participants, 6, lang),
    [event, participants, lang]
  );

  if (participants.length === 0) return null;
  if (bestMatches.length === 0) return null;

  const total = participants.length;
  const hasUnanimous = bestMatches.some(m => m.availableCount === total);

  const handleTogglePinDate = async (dateStr: string) => {
    const adminKey = typeof window !== 'undefined'
      ? localStorage.getItem(`wanwang_admin_${event.slug}`) || event.adminKey
      : event.adminKey;

    if (!adminKey) return;
    setIsPinning(true);
    setPinError('');

    try {
      const isAlreadyPinned = event.confirmedDate === dateStr;
      const res = await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          confirmedDate: isAlreadyPinned ? '' : dateStr,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update confirmed date');
      }

      onEventUpdated?.();
    } catch (err: unknown) {
      const error = err as Error;
      setPinError(error?.message || 'Error pinning date');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="border-b-3 border-ink pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">
            {t('leaderboardTitle')}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {t('leaderboardSubtitle')}
          </p>
        </div>

        {hasUnanimous ? (
          <span className="font-mono text-xs font-bold px-3 py-1 bg-accent text-ink border-2 border-ink self-start sm:self-center">
            {t('everyoneFree')}
          </span>
        ) : (
          <span className="font-mono text-xs font-bold px-3 py-1 bg-sunken text-ink border-2 border-ink self-start sm:self-center">
            {t('closestMatch')}
          </span>
        )}
      </div>

      {pinError && (
        <div className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {pinError}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {bestMatches.map((match, idx) => {
          const isSelected = selectedSlotIds.length > 0 && match.slotIds.every(id => selectedSlotIds.includes(id));
          const isEveryoneFree = total > 0 && match.availableCount === total;
          const isPinned = event.confirmedDate === match.date;

          return (
            <div
              key={match.id}
              onClick={() => onSelectMatch?.(match.slotIds)}
              className={`p-4 bg-surface cursor-pointer transition-none space-y-3 relative ${
                isPinned
                  ? 'border-5 border-ink bg-accent/15 ring-2 ring-ink'
                  : isEveryoneFree
                  ? 'border-3 border-ink bg-accent/25'
                  : isSelected
                  ? 'border-5 border-ink bg-sunken'
                  : 'border-3 border-ink hover:bg-sunken'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-ink">
                    {t('rankPrefix', { rank: idx + 1 })}
                  </span>
                  {isPinned && (
                    <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 bg-ink text-on-ink-accent uppercase">
                      {t('pinnedBadge')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isEveryoneFree ? (
                    <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 bg-accent text-ink border-2 border-ink">
                      {t('everyoneFree')}
                    </span>
                  ) : idx === 0 ? (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-sunken text-ink border-2 border-ink">
                      {t('closestMatch')}
                    </span>
                  ) : null}

                  <span className="font-mono text-xs font-bold px-2 py-0.5 border-2 border-ink bg-surface">
                    {t('matchPercent', { percent: match.percentage })}
                  </span>
                </div>
              </div>

              {/* Date & Time Info */}
              <div>
                <div className="font-bold text-sm sm:text-base text-ink">
                  {match.formattedThai}
                </div>
                <div className="font-mono text-xs text-muted mt-0.5">
                  {event.granularity === 'day' ? (
                    t('allDayLabel')
                  ) : event.granularity === 'daypart' ? (
                    `${match.dayPartLabel} (${match.startTime} - ${match.endTime})`
                  ) : (
                    `${match.startTime} - ${match.endTime} (${match.durationHours} ${t('durationSuffix')})`
                  )}
                </div>
              </div>

              {/* Progress Bar with Yellow Accent */}
              <div className="w-full bg-sunken h-2.5 border-2 border-ink">
                <div
                  className="bg-accent h-full transition-none border-r-2 border-ink"
                  style={{ width: `${match.percentage}%` }}
                />
              </div>

              {/* Free vs Missing counts */}
              <div className="flex items-center justify-between font-mono text-xs text-ink font-bold">
                <span>
                  {t('freeCountText', { free: match.availableCount, total: match.totalParticipants })}
                </span>
                {match.missingNames.length === 0 ? (
                  <span className="text-ink font-extrabold">[{t('allAvailableLabel')}]</span>
                ) : (
                  <span className="text-muted font-semibold">
                    {t('missingCount', { count: match.missingNames.length })}
                  </span>
                )}
              </div>

              {/* Names breakdown */}
              <div className="pt-2 border-t-2 border-ink text-xs space-y-1">
                <div className="truncate">
                  <span className="font-bold text-ink">{t('availableLabel')}</span> {match.availableNames.join(', ')}
                </div>
                {match.missingNames.length > 0 && (
                  <div className="text-muted truncate">
                    <span className="font-semibold text-ink">{t('missingFriendsLabel')}</span> {match.missingNames.join(', ')}
                  </div>
                )}
              </div>

              {/* Admin "ปักวันนี้" Button */}
              {isAdmin && (
                <div className="pt-2 border-t-2 border-ink flex justify-end">
                  <button
                    type="button"
                    disabled={isPinning}
                    onClick={e => {
                      e.stopPropagation();
                      handleTogglePinDate(match.date);
                    }}
                    className={`px-3 py-1.5 border-2 border-ink text-xs font-bold font-mono transition-none cursor-pointer ${
                      isPinned
                        ? 'bg-ink text-on-ink-accent hover:bg-accent hover:text-ink'
                        : 'bg-accent text-ink hover:bg-ink hover:text-on-ink-accent shadow-[2px_2px_0_rgb(var(--shadow-color))]'
                    }`}
                  >
                    {isPinned ? `✓ ${t('unpinThisDate')}` : `📌 ${t('pinThisDate')}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
