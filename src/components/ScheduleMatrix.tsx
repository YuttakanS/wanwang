'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSlotDragSelect } from '@/components/useSlotDragSelect';
import {
  WanWangEvent,
  Participant,
  SlotHeatmapInfo,
  DayPartId,
} from '@/types';
import {
  generateDayTimeSlots,
  generateAllEventSlots,
  computeHeatmap,
  formatLocalizedDate,
  formatDateToISO,
  isWeekend,
  getWeekdayHeaders,
} from '@/lib/timeUtils';
import { useI18n } from '@/lib/i18n';

interface ScheduleMatrixProps {
  event: WanWangEvent;
  participants: Participant[];
  onParticipantSaved: () => void;
  highlightSlotIds?: string[];
}

export default function ScheduleMatrix({
  event,
  participants,
  onParticipantSaved,
  highlightSlotIds = [],
}: ScheduleMatrixProps) {
  const { lang, t } = useI18n();

  const [activeTab, setActiveTab] = useState<'heatmap' | 'vote'>('vote');

  const [participantName, setParticipantName] = useState('');
  const [participantNote, setParticipantNote] = useState('');
  const [mySelectedSlots, setMySelectedSlots] = useState<string[]>([]);
  // Every cell checks this on every render, so it must not scan an array.
  const selectedSet = useMemo(() => new Set(mySelectedSlots), [mySelectedSlots]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [activeSlotInfo, setActiveSlotInfo] = useState<SlotHeatmapInfo | null>(null);

  const granularity = event.granularity || 'day';
  const allSlots = useMemo(() => generateAllEventSlots(event), [event]);
  const dayTimes = useMemo(
    () => generateDayTimeSlots(event.startTime || '09:00', event.endTime || '22:00', event.slotInterval || 60),
    [event.startTime, event.endTime, event.slotInterval]
  );
  const heatmap = useMemo(() => computeHeatmap(allSlots, participants, granularity), [allSlots, participants, granularity]);

  const rangeStart = event.dateRangeStart || event.dates[0] || formatDateToISO(new Date());
  const rangeEnd = event.dateRangeEnd || event.dates[event.dates.length - 1] || rangeStart;
  const todayStr = formatDateToISO(new Date());

  // Calendar month view state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const [y, m] = rangeStart.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const getDayPartLabel = (partId: string) => {
    switch (partId) {
      case 'morning': return `${t('partMorning')} (${t('partMorningRange')})`;
      case 'afternoon': return `${t('partAfternoon')} (${t('partAfternoonRange')})`;
      case 'evening': return `${t('partEvening')} (${t('partEveningRange')})`;
      case 'night': return `${t('partNight')} (${t('partNightRange')})`;
      default: return partId;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(`wanwang_token_${event.slug}`);
      const storedId = localStorage.getItem(`wanwang_pid_${event.slug}`);
      const found = storedToken && storedId ? participants.find(p => p.id === storedId) : undefined;
      if (found) {
        setCurrentParticipantId(found.id);
        setEditToken(storedToken);
        setParticipantName(found.name);
        setParticipantNote(found.note || '');
        setMySelectedSlots(found.availability || found.availableDates || []);
        // If already participated, switch to heatmap tab by default
        setActiveTab('heatmap');
      } else {
        // My entry is gone, so the next save must create a new one. Sending the old
        // id would be rejected as an update to someone else's data.
        setCurrentParticipantId(null);
        setEditToken(null);
      }
    }
  }, [event.slug, participants]);

  const handleToggleSlot = (slotId: string) => {
    setMySelectedSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const slotGridHandlers = useSlotDragSelect(mySelectedSlots, setMySelectedSlots);

  // The best-times list sits below this grid, so bring the highlighted slots into view.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlightSlotIds.length === 0) return;
    setActiveTab('heatmap');
    rootRef.current?.scrollIntoView({ block: 'start' });
  }, [highlightSlotIds]);

  // Filter valid selectable dates (within range and not in past)
  const validSelectableDates = useMemo(() => {
    return event.dates.filter(d => d >= todayStr && d >= rangeStart && d <= rangeEnd);
  }, [event.dates, todayStr, rangeStart, rangeEnd]);

  const selectAll = () => {
    if (granularity === 'day') {
      setMySelectedSlots([...validSelectableDates]);
    } else {
      setMySelectedSlots(allSlots.map(s => s.id));
    }
  };

  const clearAll = () => {
    setMySelectedSlots([]);
  };

  const selectWeekends = () => {
    if (granularity === 'day') {
      const weekends = validSelectableDates.filter(d => isWeekend(d));
      setMySelectedSlots(Array.from(new Set([...mySelectedSlots, ...weekends])));
    } else {
      const weekendSlots = allSlots
        .filter(s => isWeekend(s.date))
        .map(s => s.id);
      setMySelectedSlots(Array.from(new Set([...mySelectedSlots, ...weekendSlots])));
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveSuccess(false);

    if (!participantName.trim()) {
      setErrorMsg(t('errorNameRequired'));
      return;
    }

    if (mySelectedSlots.length === 0) {
      setErrorMsg(t('errorSlotRequired'));
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/events/${event.slug}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentParticipantId || undefined,
          name: participantName.trim(),
          note: participantNote.trim(),
          editToken: editToken || undefined,
          availability: mySelectedSlots,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      if (typeof window !== 'undefined' && data.participant?.editToken) {
        localStorage.setItem(`wanwang_token_${event.slug}`, data.participant.editToken);
        localStorage.setItem(`wanwang_pid_${event.slug}`, data.participant.id);
        setCurrentParticipantId(data.participant.id);
        setEditToken(data.participant.editToken);
      }

      setSaveSuccess(true);
      onParticipantSaved();

      setTimeout(() => {
        setActiveTab('heatmap');
        setSaveSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Error saving data');
    } finally {
      setIsSaving(false);
    }
  };

  // Density palette: Black/White/Gray + Accent Yellow for 100% full match
  const getDensityStyle = (percentage: number, count: number) => {
    if (count === 0 || percentage === 0) {
      return 'bg-white text-black/30 border-black';
    }
    if (percentage <= 25) {
      return 'bg-[#F0F0F0] text-black border-black font-mono';
    }
    if (percentage <= 50) {
      return 'bg-[#CCCCCC] text-black border-black font-mono font-bold';
    }
    if (percentage <= 75) {
      return 'bg-[#525252] text-white border-black font-mono font-bold';
    }
    // 100% Full Consensus: Single Accent Yellow #FFE500
    return 'bg-[#FFE500] text-black border-black font-mono font-extrabold';
  };

  // Calendar Day Generation for a given month
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isInRange: boolean;
      isPast: boolean;
    }[] = [];
    const startOffset = firstDay.getDay();

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const ds = formatDateToISO(d);
      days.push({
        dateStr: ds,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isInRange: ds >= rangeStart && ds <= rangeEnd,
        isPast: ds < todayStr,
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const ds = formatDateToISO(d);
      days.push({
        dateStr: ds,
        dayNum: i,
        isCurrentMonth: true,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isInRange: ds >= rangeStart && ds <= rangeEnd,
        isPast: ds < todayStr,
      });
    }

    while (days.length % 7 !== 0) {
      const d = new Date(year, month + 1, days.length - lastDay.getDate() - startOffset + 1);
      const ds = formatDateToISO(d);
      days.push({
        dateStr: ds,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isInRange: ds >= rangeStart && ds <= rangeEnd,
        isPast: ds < todayStr,
      });
    }

    return days;
  }, [calendarMonth, rangeStart, rangeEnd, todayStr]);

  const weekdayHeaders = getWeekdayHeaders(lang);

  const monthYearLabel = formatLocalizedDate(
    `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-01`,
    lang,
    'monthYear'
  );

  return (
    <div ref={rootRef} className="space-y-6 scroll-mt-20">
      {/* Dual Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 border-3 border-black">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vote')}
            className={`px-3 sm:px-4 py-2 border-3 border-black text-xs font-bold transition-none cursor-pointer ${
              activeTab === 'vote'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-[#F0F0F0]'
            }`}
          >
            {t('tabVote', { count: mySelectedSlots.length })}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 sm:px-4 py-2 border-3 border-black text-xs font-bold transition-none cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-[#F0F0F0]'
            }`}
          >
            {t('tabHeatmap', { count: participants.length })}
          </button>
        </div>

        {/* Legend */}
        {activeTab === 'heatmap' && (
          <div className="flex items-center gap-2 font-mono text-xs text-black">
            <span>{t('densityZero')}</span>
            <div className="flex items-center">
              <span className="w-3.5 h-3.5 bg-white border-2 border-black inline-block" />
              <span className="w-3.5 h-3.5 bg-[#F0F0F0] border-2 border-black inline-block" />
              <span className="w-3.5 h-3.5 bg-[#CCCCCC] border-2 border-black inline-block" />
              <span className="w-3.5 h-3.5 bg-[#525252] border-2 border-black inline-block" />
              <span className="w-3.5 h-3.5 bg-[#FFE500] border-2 border-black inline-block" />
            </div>
            <span>{t('densityAll')}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: VOTE MODE
          ========================================================================= */}
      {activeTab === 'vote' && (
        <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-5 motion-enter">
          {event.isClosed ? (
            <div className="p-4 bg-[#F0F0F0] border-3 border-black text-black font-bold text-sm text-center">
              {t('votingClosedAlert')}
            </div>
          ) : (
            <form onSubmit={handleSaveAvailability} className="space-y-5">
              {/* Display Name Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b-3 border-black pb-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    {t('yourNameLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={participantName}
                    onChange={e => setParticipantName(e.target.value)}
                    placeholder={t('yourNamePlaceholder')}
                    className="w-full px-3 py-2.5 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-sans text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none"
                  />
                  {currentParticipantId && (
                    <p className="text-xs text-black font-semibold mt-1">
                      {t('editResponseNote')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">
                    {t('yourNoteLabel')}
                  </label>
                  <input
                    type="text"
                    value={participantNote}
                    onChange={e => setParticipantNote(e.target.value)}
                    placeholder={t('yourNotePlaceholder')}
                    className="w-full px-3 py-2.5 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-sans text-xs focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none"
                  />
                </div>
              </div>

              {/* New tab: following this link must not lose what was typed. */}
              <p className="text-xs text-[#525252]">
                {t('voteVisibilityNote')}{' '}
                <Link href="/privacy" target="_blank" rel="noopener" className="underline hover:text-black">
                  {t('privacyLink')}
                </Link>
              </p>

              {/* Instructions & Shortcuts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#F0F0F0] p-3 border-2 border-black">
                <span className="text-xs font-bold text-black">
                  {granularity === 'day'
                    ? t('voteCalendarPrompt')
                    : granularity === 'daypart'
                    ? t('votePromptDaypart')
                    : t('dragInstructions')}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={selectWeekends}
                    className="px-2.5 py-1 bg-white hover:bg-black hover:text-[#FFE500] text-black border-2 border-black transition-none font-bold cursor-pointer"
                  >
                    {t('shortcutWeekendsOnly')}
                  </button>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-black border-2 border-black transition-none font-bold cursor-pointer"
                  >
                    {t('btnSelectAll')}
                  </button>
                  {mySelectedSlots.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-2.5 py-1 bg-white text-black hover:bg-black hover:text-white border-2 border-black transition-none font-bold cursor-pointer"
                    >
                      {t('shortcutClearSelection')}
                    </button>
                  )}
                </div>
              </div>

              {/* Mode 1: Day Voting Calendar Grid with Tap & Drag */}
              {granularity === 'day' && (
                <div className="bg-white p-3 sm:p-5 border-3 border-black max-w-lg mx-auto">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                    <span className="font-bold text-sm text-black">
                      {monthYearLabel}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="px-2 py-0.5 border-2 border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                      >
                        {t('prevMonthBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="px-2 py-0.5 border-2 border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                      >
                        {t('nextMonthBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers: Sunday first */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 font-mono text-xs font-bold border-b-2 border-black pb-1">
                    {weekdayHeaders.map((day, idx) => (
                      <div
                        key={`${day}-${idx}`}
                        className={idx === 0 || idx === 6 ? 'text-black font-extrabold' : 'text-[#525252]'}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Day Grid with Touch & Mouse Drag Support */}
                  <div
                    {...slotGridHandlers}
                    style={{ touchAction: 'pan-y' }}
                    className="grid grid-cols-7 gap-1.5 select-none"
                  >
                    {calendarDays.map((d, index) => {
                      const isDisabled = !d.isInRange || d.isPast;
                      const isSelected = selectedSet.has(d.dateStr);

                      if (isDisabled) {
                        return (
                          <div
                            key={`${d.dateStr}-${index}`}
                            title={d.isPast ? t('pastDateNote') : t('outOfRangeNote')}
                            className="aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-[#D4D4D4] bg-[#F5F5F5] text-[#A3A3A3] cursor-not-allowed select-none"
                          >
                            <span>{d.dayNum}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${d.dateStr}-${index}`}
                          data-slot-id={d.dateStr}
                          className={`aspect-square flex flex-col items-center justify-center font-mono text-xs font-bold border-2 border-black transition-none cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFE500] text-black font-extrabold shadow-[2px_2px_0_#000]'
                              : 'bg-white hover:bg-[#F0F0F0] text-black'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{d.dayNum}</span>
                          {isSelected && <span className="text-[10px] leading-none font-bold">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 2: Daypart Voting Interface (Row per day, 4 buttons) */}
              {granularity === 'daypart' && (
                <div className="border-3 border-black bg-white overflow-x-auto select-none pb-1">
                  <div className="min-w-[540px]">
                    <div className="grid grid-cols-5 border-b-3 border-black bg-black text-white font-mono text-xs font-bold p-2 text-center">
                      <div className="text-left pl-2">{t('dateColumnLabel')}</div>
                      <div>{t('partMorning')} <span className="text-[10px] opacity-75">({t('partMorningRange')})</span></div>
                      <div>{t('partAfternoon')} <span className="text-[10px] opacity-75">({t('partAfternoonRange')})</span></div>
                      <div>{t('partEvening')} <span className="text-[10px] opacity-75">({t('partEveningRange')})</span></div>
                      <div>{t('partNight')} <span className="text-[10px] opacity-75">({t('partNightRange')})</span></div>
                    </div>

                    {event.dates.map(dateStr => (
                      <div key={dateStr} className="grid grid-cols-5 border-b-2 border-black last:border-b-0 items-center">
                        <div className="p-3 font-bold text-xs text-black border-r-2 border-black bg-[#F0F0F0]">
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>

                        {(['morning', 'afternoon', 'evening', 'night'] as DayPartId[]).map(part => {
                          const slotId = `${dateStr}T${part}`;
                          const isSelected = selectedSet.has(slotId);
                          return (
                            <button
                              key={slotId}
                              type="button"
                              onClick={() => handleToggleSlot(slotId)}
                              className={`h-12 border-r-2 border-black last:border-r-0 flex flex-col items-center justify-center font-mono text-xs transition-none cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FFE500] text-black font-extrabold'
                                  : 'bg-white hover:bg-[#F0F0F0] text-black/30'
                              }`}
                            >
                              {isSelected ? (
                                <span className="font-bold text-black text-sm">[✓]</span>
                              ) : (
                                <span className="text-sm">-</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Hourly Matrix Grid */}
              {granularity === 'hour' && (
                <div className="overflow-x-auto select-none pb-2">
                  <div
                    {...slotGridHandlers}
                    style={{ touchAction: 'pan-x' }}
                    className="min-w-fit inline-block border-3 border-black bg-white"
                  >
                    {/* Header Row: Dates */}
                    <div className="flex border-b-3 border-black bg-black text-white sticky top-0 z-10 font-mono text-xs font-bold">
                      <div className="w-20 sm:w-24 shrink-0 p-2 text-center border-r-2 border-white flex items-center justify-center">
                        {t('timeColumnLabel')}
                      </div>
                      {event.dates.map(dateStr => (
                        <div
                          key={dateStr}
                          className="w-24 sm:w-28 shrink-0 p-2 text-center border-r-2 border-white last:border-r-0"
                        >
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>
                      ))}
                    </div>

                    {/* Body Rows */}
                    {dayTimes.map(time => (
                      <div key={time} className="flex border-b-2 border-black last:border-b-0">
                        <div className="w-20 sm:w-24 shrink-0 px-2 py-1.5 text-center font-mono text-xs text-black border-r-2 border-black flex items-center justify-center bg-[#F0F0F0] font-bold">
                          {time}
                        </div>

                        {event.dates.map(dateStr => {
                          const slotId = `${dateStr}T${time}`;
                          const isSelected = selectedSet.has(slotId);

                          return (
                            <div
                              key={slotId}
                              data-slot-id={slotId}
                              className={`w-24 sm:w-28 h-8 shrink-0 border-r-2 border-black last:border-r-0 cursor-pointer transition-none flex items-center justify-center font-mono text-xs ${
                                isSelected
                                  ? 'bg-[#FFE500] text-black font-extrabold border-black'
                                  : 'bg-white hover:bg-[#F0F0F0] text-black/25'
                              }`}
                            >
                              {isSelected ? '[✓]' : '-'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-[#FFE500] border-3 border-black text-black font-mono text-xs motion-shake">
                  [ERROR] {errorMsg}
                </div>
              )}

              {/* Success Notification */}
              {saveSuccess && (
                <div className="p-3 bg-[#F0F0F0] border-3 border-black text-black font-mono text-xs font-bold motion-pop">
                  [SUCCESS] {t('saveSuccessMsg')}
                </div>
              )}

              {/* Submit Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t-3 border-black">
                <span className="font-mono text-xs text-black font-bold">
                  {t('selectedDaysCount', { count: mySelectedSlots.length })}
                </span>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary-raw px-6 py-2.5 text-sm cursor-pointer"
                >
                  {isSaving ? t('savingDataBtn') : t('saveMyAvailabilityBtn')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: GROUP HEATMAP MATRIX
          ========================================================================= */}
      {activeTab === 'heatmap' && (
        <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-5 motion-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-black pb-3">
            <div>
              <h3 className="text-lg font-bold text-black">
                {t('inspectTitle')}
              </h3>
              <p className="text-xs text-[#525252] mt-0.5">
                {t('inspectSubtitle')}
              </p>
            </div>
            <span className="font-mono text-xs uppercase px-2 py-0.5 bg-black text-white font-bold shrink-0">
              {participants.length} RESPONSES
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="py-10 text-center space-y-3 border-2 border-dashed border-black p-5">
              <h4 className="font-bold text-lg text-black">
                {t('emptyHeatmapTitle')}
              </h4>
              <p className="text-xs text-[#525252]">
                {t('emptyHeatmapDesc')}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('vote')}
                className="btn-primary-raw px-5 py-2 text-xs cursor-pointer"
              >
                {t('recordFirstBtn')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mode 1: Day Heatmap Calendar Grid with 'N/M' counts */}
              {granularity === 'day' && (
                <div className="bg-white p-3 sm:p-5 border-3 border-black max-w-lg mx-auto">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                    <span className="font-bold text-sm text-black">
                      {monthYearLabel}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="px-2 py-0.5 border-2 border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                      >
                        {t('prevMonthBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="px-2 py-0.5 border-2 border-black hover:bg-black hover:text-white transition-none cursor-pointer"
                      >
                        {t('nextMonthBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers: Sunday first */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 font-mono text-xs font-bold border-b-2 border-black pb-1">
                    {weekdayHeaders.map((day, idx) => (
                      <div
                        key={`${day}-${idx}`}
                        className={idx === 0 || idx === 6 ? 'text-black font-extrabold' : 'text-[#525252]'}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Grid */}
                  <div className="grid grid-cols-7 gap-1.5 select-none">
                    {calendarDays.map((d, index) => {
                      if (!d.isInRange) {
                        return (
                          <div
                            key={`${d.dateStr}-${index}`}
                            className="aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-[#E5E5E5] bg-[#FAFAFA] text-[#CCCCCC] select-none"
                          >
                            <span>{d.dayNum}</span>
                          </div>
                        );
                      }

                      const info = heatmap[d.dateStr] || {
                        slotId: d.dateStr,
                        date: d.dateStr,
                        time: 'all-day',
                        availableCount: 0,
                        totalParticipants: participants.length,
                        percentage: 0,
                        availableNames: [],
                        unavailableNames: participants.map(p => p.name),
                      };

                      const isCurrentActive = activeSlotInfo?.slotId === d.dateStr;
                      const cellStyle = getDensityStyle(info.percentage, info.availableCount);
                      const isUnanimous = info.totalParticipants > 0 && info.availableCount === info.totalParticipants;

                      return (
                        <div
                          key={`${d.dateStr}-${index}`}
                          onClick={() => setActiveSlotInfo(info)}
                          className={`aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-black transition-none cursor-pointer p-0.5 ${cellStyle} ${
                            isCurrentActive ? 'ring-3 ring-black z-10' : ''
                          }`}
                        >
                          <span className="font-bold text-xs sm:text-sm">{d.dayNum}</span>
                          <span className={`text-[10px] leading-tight font-extrabold ${isUnanimous ? 'text-black' : ''}`}>
                            {info.availableCount}/{info.totalParticipants}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 2: Daypart Heatmap Table */}
              {granularity === 'daypart' && (
                <div className="border-3 border-black bg-white overflow-x-auto select-none pb-1">
                  <div className="min-w-[540px]">
                    <div className="grid grid-cols-5 border-b-3 border-black bg-black text-white font-mono text-xs font-bold p-2 text-center">
                      <div className="text-left pl-2">{t('dateColumnLabel')}</div>
                      <div>{t('partMorning')} <span className="text-[10px] opacity-75">({t('partMorningRange')})</span></div>
                      <div>{t('partAfternoon')} <span className="text-[10px] opacity-75">({t('partAfternoonRange')})</span></div>
                      <div>{t('partEvening')} <span className="text-[10px] opacity-75">({t('partEveningRange')})</span></div>
                      <div>{t('partNight')} <span className="text-[10px] opacity-75">({t('partNightRange')})</span></div>
                    </div>

                    {event.dates.map(dateStr => (
                      <div key={dateStr} className="grid grid-cols-5 border-b-2 border-black last:border-b-0 items-center">
                        <div className="p-3 font-bold text-xs text-black border-r-2 border-black bg-[#F0F0F0]">
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>

                        {(['morning', 'afternoon', 'evening', 'night'] as DayPartId[]).map(part => {
                          const slotId = `${dateStr}T${part}`;
                          const info = heatmap[slotId] || {
                            slotId,
                            date: dateStr,
                            time: part,
                            availableCount: 0,
                            totalParticipants: participants.length,
                            percentage: 0,
                            availableNames: [],
                            unavailableNames: participants.map(p => p.name),
                          };
                          const isHighlighted = highlightSlotIds.includes(slotId);
                          const isCurrentActive = activeSlotInfo?.slotId === slotId;
                          const cellStyle = getDensityStyle(info.percentage, info.availableCount);

                          return (
                            <div
                              key={slotId}
                              onClick={() => setActiveSlotInfo(info)}
                              className={`h-11 border-r-2 border-black last:border-r-0 cursor-pointer transition-none flex flex-col items-center justify-center font-mono text-xs ${cellStyle} ${
                                isHighlighted ? 'outline-4 outline-black z-20' : ''
                              } ${isCurrentActive ? 'border-4 border-black' : ''}`}
                            >
                              {info.availableCount > 0 ? (
                                <span>
                                  {info.availableCount}/{info.totalParticipants}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 3: Hourly Matrix Table */}
              {granularity === 'hour' && (
                <div className="overflow-x-auto select-none pb-2">
                  <div className="min-w-fit inline-block border-3 border-black bg-white">
                    {/* Header Row */}
                    <div className="flex border-b-3 border-black bg-black text-white sticky top-0 z-10 font-mono text-xs font-bold">
                      <div className="w-20 sm:w-24 shrink-0 p-2 text-center border-r-2 border-white flex items-center justify-center">
                        {t('timeColumnLabel')}
                      </div>
                      {event.dates.map(dateStr => (
                        <div
                          key={dateStr}
                          className="w-24 sm:w-28 shrink-0 p-2 text-center border-r-2 border-white last:border-r-0"
                        >
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>
                      ))}
                    </div>

                    {/* Body Rows */}
                    {dayTimes.map(time => (
                      <div key={time} className="flex border-b-2 border-black last:border-b-0">
                        <div className="w-20 sm:w-24 shrink-0 px-2 py-1.5 text-center font-mono text-xs text-black border-r-2 border-black flex items-center justify-center bg-[#F0F0F0] font-bold">
                          {time}
                        </div>

                        {event.dates.map(dateStr => {
                          const slotId = `${dateStr}T${time}`;
                          const info = heatmap[slotId] || {
                            slotId,
                            date: dateStr,
                            time,
                            availableCount: 0,
                            totalParticipants: participants.length,
                            percentage: 0,
                            availableNames: [],
                            unavailableNames: participants.map(p => p.name),
                          };

                          const isHighlighted = highlightSlotIds.includes(slotId);
                          const isCurrentActive = activeSlotInfo?.slotId === slotId;
                          const cellStyle = getDensityStyle(info.percentage, info.availableCount);

                          return (
                            <div
                              key={slotId}
                              onClick={() => setActiveSlotInfo(info)}
                              onMouseEnter={() => setActiveSlotInfo(info)}
                              className={`w-24 sm:w-28 h-8 shrink-0 border-r-2 border-black last:border-r-0 cursor-pointer transition-none flex flex-col items-center justify-center font-mono text-xs ${cellStyle} ${
                                isHighlighted ? 'outline-4 outline-black z-20' : ''
                              } ${isCurrentActive ? 'border-4 border-black' : ''}`}
                            >
                              {info.availableCount > 0 ? (
                                <span>
                                  {info.availableCount}/{info.totalParticipants}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspector Popover / Card for Clicked Slot */}
              {activeSlotInfo && (
                <div className="p-4 bg-black text-white border-3 border-black font-sans text-xs space-y-3 motion-enter">
                  <div className="flex items-center justify-between border-b-2 border-white/40 pb-2">
                    <span className="font-bold text-white text-sm">
                      {granularity === 'day' ? (
                        `${formatLocalizedDate(activeSlotInfo.date, lang, 'chip')} (${t('allDayLabel')})`
                      ) : granularity === 'daypart' ? (
                        `${formatLocalizedDate(activeSlotInfo.date, lang, 'chip')} - ${getDayPartLabel(activeSlotInfo.time)}`
                      ) : (
                        t('dataHeader', {
                          date: formatLocalizedDate(activeSlotInfo.date, lang, 'chip'),
                          time: activeSlotInfo.time,
                        })
                      )}
                    </span>
                    <span className="font-mono font-bold bg-[#FFE500] text-black px-2.5 py-0.5 text-xs">
                      {activeSlotInfo.availableCount}/{activeSlotInfo.totalParticipants} ({activeSlotInfo.percentage}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-[#FFE500] block mb-1.5">
                        {t('confirmedFreeLabel', { count: activeSlotInfo.availableNames.length })}
                      </span>
                      {activeSlotInfo.availableNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlotInfo.availableNames.map(name => (
                            <span key={name} className="px-2 py-0.5 bg-white text-black font-semibold">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-white/60">{t('noneLabel')}</span>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-white/80 block mb-1.5">
                        {t('busyListLabel', { count: activeSlotInfo.unavailableNames.length })}
                      </span>
                      {activeSlotInfo.unavailableNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlotInfo.unavailableNames.map(name => (
                            <span key={name} className="px-2 py-0.5 bg-[#525252] text-white">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#FFE500] font-bold">{t('allAvailableLabel')}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
