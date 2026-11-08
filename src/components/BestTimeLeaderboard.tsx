'use client';

import React, { useState } from 'react';
import { WanWangEvent, Participant } from '@/types';
import { findBestTimeMatches, formatLocalizedDate } from '@/lib/timeUtils';
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

  if (participants.length === 0) return null;

  // Retrieve matches sorted by available count descending
  const bestMatches = findBestTimeMatches(event, participants, 6, lang);
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
    <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="border-b-3 border-black pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-black leading-tight">
            {t('leaderboardTitle')}
          </h3>
          <p className="text-xs text-[#525252] mt-0.5">
            {t('leaderboardSubtitle')}
          </p>
        </div>

        {hasUnanimous ? (
          <span className="font-mono text-xs font-bold px-3 py-1 bg-[#FFE500] text-black border-2 border-black self-start sm:self-center">
            {t('everyoneFree')}
          </span>
        ) : (
          <span className="font-mono text-xs font-bold px-3 py-1 bg-[#F0F0F0] text-black border-2 border-black self-start sm:self-center">
            {t('closestMatch')}
          </span>
        )}
      </div>

      {pinError && (
        <div className="p-3 bg-[#FFE500] border-2 border-black text-black font-mono text-xs">
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
              className={`p-4 bg-white cursor-pointer transition-none space-y-3 relative ${
                isPinned
                  ? 'border-5 border-black bg-[#FFE500]/15 ring-2 ring-black'
                  : isEveryoneFree
                  ? 'border-3 border-black bg-[#FFE500]/25'
                  : isSelected
                  ? 'border-5 border-black bg-[#F0F0F0]'
                  : 'border-3 border-black hover:bg-[#F0F0F0]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-black">
                    {t('rankPrefix', { rank: idx + 1 })}
                  </span>
                  {isPinned && (
                    <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 bg-black text-[#FFE500] uppercase">
                      {t('pinnedBadge')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isEveryoneFree ? (
                    <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 bg-[#FFE500] text-black border-2 border-black">
                      {t('everyoneFree')}
                    </span>
                  ) : idx === 0 ? (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#F0F0F0] text-black border-2 border-black">
                      {t('closestMatch')}
                    </span>
                  ) : null}

                  <span className="font-mono text-xs font-bold px-2 py-0.5 border-2 border-black bg-white">
                    {t('matchPercent', { percent: match.percentage })}
                  </span>
                </div>
              </div>

              {/* Date & Time Info */}
              <div>
                <div className="font-bold text-sm sm:text-base text-black">
                  {match.formattedThai}
                </div>
                <div className="font-mono text-xs text-[#525252] mt-0.5">
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
              <div className="w-full bg-[#F0F0F0] h-2.5 border-2 border-black">
                <div
                  className="bg-[#FFE500] h-full transition-none border-r-2 border-black"
                  style={{ width: `${match.percentage}%` }}
                />
              </div>

              {/* Free vs Missing counts */}
              <div className="flex items-center justify-between font-mono text-xs text-black font-bold">
                <span>
                  {t('freeCountText', { free: match.availableCount, total: match.totalParticipants })}
                </span>
                {match.missingNames.length === 0 ? (
                  <span className="text-black font-extrabold">[{t('allAvailableLabel')}]</span>
                ) : (
                  <span className="text-[#525252] font-semibold">
                    {t('missingCount', { count: match.missingNames.length })}
                  </span>
                )}
              </div>

              {/* Names breakdown */}
              <div className="pt-2 border-t-2 border-black text-xs space-y-1">
                <div className="truncate">
                  <span className="font-bold text-black">{t('availableLabel')}</span> {match.availableNames.join(', ')}
                </div>
                {match.missingNames.length > 0 && (
                  <div className="text-[#525252] truncate">
                    <span className="font-semibold text-black">{t('missingFriendsLabel')}</span> {match.missingNames.join(', ')}
                  </div>
                )}
              </div>

              {/* Admin "ปักวันนี้" Button */}
              {isAdmin && (
                <div className="pt-2 border-t-2 border-black flex justify-end">
                  <button
                    type="button"
                    disabled={isPinning}
                    onClick={e => {
                      e.stopPropagation();
                      handleTogglePinDate(match.date);
                    }}
                    className={`px-3 py-1.5 border-2 border-black text-xs font-bold font-mono transition-none cursor-pointer ${
                      isPinned
                        ? 'bg-black text-[#FFE500] hover:bg-[#FFE500] hover:text-black'
                        : 'bg-[#FFE500] text-black hover:bg-black hover:text-[#FFE500] shadow-[2px_2px_0_#000]'
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
