'use client';

import React, { Dispatch, SetStateAction, useCallback, useId, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSlotDragSelect } from '@/components/useSlotDragSelect';
import QuestionFields, { firstUnanswered } from '@/components/QuestionFields';
import { fullSlotsFor, slotsTakenByOthers, withinLimits } from '@/lib/slotLimits';
import {
  WanWangEvent,
  Participant,
  SlotHeatmapInfo,
  DayPartId,
  Answers,
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
import { buildMonthCells } from '@/lib/monthCells';

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
  const idBase = useId();

  const [activeTab, setActiveTab] = useState<'heatmap' | 'vote'>('vote');

  const [participantName, setParticipantName] = useState('');
  const [participantNote, setParticipantNote] = useState('');
  const [mySelectedSlots, setMySelectedSlots] = useState<string[]>([]);
  // Every cell checks this on every render, so it must not scan an array.
  const selectedSet = useMemo(() => new Set(mySelectedSlots), [mySelectedSlots]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [myAnswers, setMyAnswers] = useState<Answers>({});
  const [isUploading, setIsUploading] = useState(false);

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
        setMyAnswers(found.answers ?? {});
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

  const questions = event.questions ?? [];
  const maxPerSlot = event.maxPerSlot || null;
  const maxPicks = event.maxPicks || null;

  // How many other people hold each slot. My own saved answer is left out, matching the server:
  // a slot I already hold is never "full" for me, so I can still edit my answer.
  const takenByOthers = useMemo(
    () => slotsTakenByOthers(participants, currentParticipantId, maxPerSlot),
    [participants, currentParticipantId, maxPerSlot]
  );

  const fullSlots = useMemo(
    () => fullSlotsFor(participants, currentParticipantId, maxPerSlot),
    [participants, currentParticipantId, maxPerSlot]
  );

  // Every way of picking slots (tap, drag, shortcuts) goes through here, so none of them can
  // take a full slot or go over the per-person limit.
  const setSlotsWithinLimits: Dispatch<SetStateAction<string[]>> = useCallback(
    action =>
      setMySelectedSlots(prev =>
        withinLimits(prev, typeof action === 'function' ? action(prev) : action, fullSlots, maxPicks)
      ),
    [fullSlots, maxPicks]
  );

  const handleToggleSlot = (slotId: string) => {
    setSlotsWithinLimits(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const slotGridHandlers = useSlotDragSelect(mySelectedSlots, setSlotsWithinLimits);

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
      setSlotsWithinLimits([...validSelectableDates]);
    } else {
      setSlotsWithinLimits(allSlots.map(s => s.id));
    }
  };

  const clearAll = () => {
    setMySelectedSlots([]);
  };

  const selectWeekends = () => {
    if (granularity === 'day') {
      const weekends = validSelectableDates.filter(d => isWeekend(d));
      setSlotsWithinLimits(Array.from(new Set([...mySelectedSlots, ...weekends])));
    } else {
      const weekendSlots = allSlots
        .filter(s => isWeekend(s.date))
        .map(s => s.id);
      setSlotsWithinLimits(Array.from(new Set([...mySelectedSlots, ...weekendSlots])));
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

    const unanswered = firstUnanswered(questions, myAnswers);
    if (unanswered) {
      setErrorMsg(t('errorAnswerRequired', { label: unanswered.label }));
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
          answers: myAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'SLOT_FULL') {
          // Someone took the last place while this form was open: drop those slots and reload the counts.
          const gone = new Set<string>(data.fullSlots ?? []);
          setMySelectedSlots(prev => prev.filter(s => !gone.has(s)));
          onParticipantSaved();
          throw new Error(t('errorSlotFull'));
        }
        if (data.code === 'EVENT_FULL') throw new Error(t('errorEventFull'));
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
      return 'bg-surface text-ink/60 border-ink';
    }
    if (percentage <= 25) {
      return 'bg-heat-1 text-on-heat-1 border-ink font-mono';
    }
    if (percentage <= 50) {
      return 'bg-heat-2 text-on-heat-2 border-ink font-mono font-bold';
    }
    if (percentage <= 75) {
      return 'bg-heat-3 text-on-heat-3 border-ink font-mono font-bold';
    }
    // 100% Full Consensus: Single Accent Yellow #FFE500
    return 'bg-accent text-ink border-ink font-mono font-extrabold';
  };

  const calendarDays = useMemo(
    () => buildMonthCells(calendarMonth, rangeStart, rangeEnd, todayStr),
    [calendarMonth, rangeStart, rangeEnd, todayStr]
  );

  const weekdayHeaders = getWeekdayHeaders(lang);

  const monthYearLabel = formatLocalizedDate(
    `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-01`,
    lang,
    'monthYear'
  );

  return (
    <div ref={rootRef} className="space-y-6 scroll-mt-20">
      {/* Dual Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-2.5 sm:p-3 border-3 border-ink">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vote')}
            className={`px-3 sm:px-4 py-2 border-3 border-ink text-xs font-bold transition-none cursor-pointer ${
              activeTab === 'vote'
                ? 'bg-ink text-surface'
                : 'bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {t('tabVote', { count: mySelectedSlots.length })}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 sm:px-4 py-2 border-3 border-ink text-xs font-bold transition-none cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-ink text-surface'
                : 'bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {t('tabHeatmap', { count: participants.length })}
          </button>
        </div>

        {/* Legend */}
        {activeTab === 'heatmap' && (
          <div className="flex items-center gap-2 font-mono text-xs text-ink">
            <span>{t('densityZero')}</span>
            <div className="flex items-center">
              <span className="w-3.5 h-3.5 bg-surface border-2 border-ink inline-block" />
              <span className="w-3.5 h-3.5 bg-heat-1 border-2 border-ink inline-block" />
              <span className="w-3.5 h-3.5 bg-heat-2 border-2 border-ink inline-block" />
              <span className="w-3.5 h-3.5 bg-heat-3 border-2 border-ink inline-block" />
              <span className="w-3.5 h-3.5 bg-accent border-2 border-ink inline-block" />
            </div>
            <span>{t('densityAll')}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: VOTE MODE
          ========================================================================= */}
      {activeTab === 'vote' && (
        <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5 motion-enter">
          {event.isClosed ? (
            <div className="p-4 bg-sunken border-3 border-ink text-ink font-bold text-sm text-center">
              {t('votingClosedAlert')}
            </div>
          ) : (
            <form onSubmit={handleSaveAvailability} className="space-y-5">
              {/* Display Name Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b-3 border-ink pb-4">
                <div>
                  <label htmlFor={`${idBase}-name`} className="block text-sm font-bold text-ink mb-1">
                    {t('yourNameLabel')}
                  </label>
                  <input
                    id={`${idBase}-name`}
                    type="text"
                    required
                    value={participantName}
                    onChange={e => setParticipantName(e.target.value)}
                    placeholder={t('yourNamePlaceholder')}
                    className="w-full px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
                  />
                  {currentParticipantId && (
                    <p className="text-xs text-ink font-semibold mt-1">
                      {t('editResponseNote')}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${idBase}-note`} className="block text-sm font-bold text-ink mb-1">
                    {t('yourNoteLabel')}
                  </label>
                  <input
                    id={`${idBase}-note`}
                    type="text"
                    value={participantNote}
                    onChange={e => setParticipantNote(e.target.value)}
                    placeholder={t('yourNotePlaceholder')}
                    className="w-full px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-xs focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
                  />
                </div>
              </div>

              <QuestionFields
                slug={event.slug}
                questions={questions}
                answers={myAnswers}
                onChange={setMyAnswers}
                onUploadingChange={setIsUploading}
              />

              {(maxPerSlot || maxPicks) && (
                <div className="p-3 bg-accent border-2 border-ink text-black font-mono text-xs font-bold">
                  {[
                    maxPerSlot ? t('limitPerSlotNote', { count: maxPerSlot }) : '',
                    maxPicks ? t('limitPicksNote', { count: maxPicks }) : '',
                  ]
                    .filter(Boolean)
                    .join(' // ')}
                </div>
              )}

              {/* New tab: following this link must not lose what was typed. */}
              <p className="text-xs text-muted">
                {t('voteVisibilityNote')}{' '}
                <Link href="/privacy" target="_blank" rel="noopener" className="underline hover:text-ink">
                  {t('privacyLink')}
                </Link>
              </p>

              {/* Instructions & Shortcuts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-sunken p-3 border-2 border-ink">
                <span className="text-xs font-bold text-ink">
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
                    className="px-2.5 py-1 bg-surface hover:bg-ink hover:text-on-ink-accent text-ink border-2 border-ink transition-none font-bold cursor-pointer"
                  >
                    {t('shortcutWeekendsOnly')}
                  </button>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2.5 py-1 bg-surface hover:bg-ink hover:text-surface text-ink border-2 border-ink transition-none font-bold cursor-pointer"
                  >
                    {t('btnSelectAll')}
                  </button>
                  {mySelectedSlots.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-2.5 py-1 bg-surface text-ink hover:bg-ink hover:text-surface border-2 border-ink transition-none font-bold cursor-pointer"
                    >
                      {t('shortcutClearSelection')}
                    </button>
                  )}
                </div>
              </div>

              {/* Mode 1: Day Voting Calendar Grid with Tap & Drag */}
              {granularity === 'day' && (
                <div className="bg-surface p-3 sm:p-5 border-3 border-ink max-w-lg mx-auto">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 border-b-2 border-ink pb-2">
                    <span className="font-bold text-sm text-ink">
                      {monthYearLabel}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="px-2 py-0.5 border-2 border-ink hover:bg-ink hover:text-surface transition-none cursor-pointer"
                      >
                        {t('prevMonthBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="px-2 py-0.5 border-2 border-ink hover:bg-ink hover:text-surface transition-none cursor-pointer"
                      >
                        {t('nextMonthBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers: Sunday first */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 font-mono text-xs font-bold border-b-2 border-ink pb-1">
                    {weekdayHeaders.map((day, idx) => (
                      <div
                        key={`${day}-${idx}`}
                        className={idx === 0 || idx === 6 ? 'text-ink font-extrabold' : 'text-muted'}
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
                      const isSelected = selectedSet.has(d.dateStr);
                      const isFull = d.isInRange && !d.isPast && fullSlots.has(d.dateStr) && !isSelected;
                      const isDisabled = !d.isInRange || d.isPast || isFull;

                      if (isDisabled) {
                        return (
                          <div
                            key={`${d.dateStr}-${index}`}
                            title={isFull ? t('slotFullNote') : d.isPast ? t('pastDateNote') : t('outOfRangeNote')}
                            className="aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-line-soft bg-sunken text-faint cursor-not-allowed select-none"
                          >
                            <span>{d.dayNum}</span>
                            {isFull && <span className="text-[10px] leading-none font-bold">{t('slotFullTag')}</span>}
                          </div>
                        );
                      }

                      const placesLeft = maxPerSlot ? maxPerSlot - (takenByOthers.get(d.dateStr) ?? 0) : null;

                      return (
                        <div
                          key={`${d.dateStr}-${index}`}
                          data-slot-id={d.dateStr}
                          className={`aspect-square flex flex-col items-center justify-center font-mono text-xs font-bold border-2 border-ink transition-none cursor-pointer ${
                            isSelected
                              ? 'bg-accent text-ink font-extrabold shadow-[2px_2px_0_rgb(var(--shadow-color))]'
                              : 'bg-surface hover:bg-sunken text-ink'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">{d.dayNum}</span>
                          {isSelected ? (
                            <span className="text-[10px] leading-none font-bold">✓</span>
                          ) : (
                            placesLeft !== null && (
                              <span className="text-[10px] leading-none font-normal">
                                {t('slotLeftTag', { count: placesLeft })}
                              </span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 2: Daypart Voting Interface (Row per day, 4 buttons) */}
              {granularity === 'daypart' && (
                <div className="border-3 border-ink bg-surface overflow-x-auto select-none pb-1">
                  <div className="min-w-[540px]">
                    <div className="grid grid-cols-5 border-b-3 border-ink bg-ink text-surface font-mono text-xs font-bold p-2 text-center">
                      <div className="text-left pl-2">{t('dateColumnLabel')}</div>
                      <div>{t('partMorning')} <span className="text-[10px] opacity-75">({t('partMorningRange')})</span></div>
                      <div>{t('partAfternoon')} <span className="text-[10px] opacity-75">({t('partAfternoonRange')})</span></div>
                      <div>{t('partEvening')} <span className="text-[10px] opacity-75">({t('partEveningRange')})</span></div>
                      <div>{t('partNight')} <span className="text-[10px] opacity-75">({t('partNightRange')})</span></div>
                    </div>

                    {event.dates.map(dateStr => (
                      <div key={dateStr} className="grid grid-cols-5 border-b-2 border-ink last:border-b-0 items-center">
                        <div className="p-3 font-bold text-xs text-ink border-r-2 border-ink bg-sunken">
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>

                        {(['morning', 'afternoon', 'evening', 'night'] as DayPartId[]).map(part => {
                          const slotId = `${dateStr}T${part}`;
                          const isSelected = selectedSet.has(slotId);
                          const isFull = fullSlots.has(slotId) && !isSelected;
                          return (
                            <button
                              key={slotId}
                              type="button"
                              disabled={isFull}
                              title={isFull ? t('slotFullNote') : undefined}
                              onClick={() => handleToggleSlot(slotId)}
                              className={`h-12 border-r-2 border-ink last:border-r-0 flex flex-col items-center justify-center font-mono text-xs transition-none ${
                                isFull
                                  ? 'bg-sunken text-faint cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-accent text-ink font-extrabold cursor-pointer'
                                  : 'bg-surface hover:bg-sunken text-ink/30 cursor-pointer'
                              }`}
                            >
                              {isFull ? (
                                <span className="text-[10px] font-bold">{t('slotFullTag')}</span>
                              ) : isSelected ? (
                                <span className="font-bold text-ink text-sm">[✓]</span>
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
                    className="min-w-fit inline-block border-3 border-ink bg-surface"
                  >
                    {/* Header Row: Dates */}
                    <div className="flex border-b-3 border-ink bg-ink text-surface sticky top-0 z-10 font-mono text-xs font-bold">
                      <div className="w-20 sm:w-24 shrink-0 p-2 text-center border-r-2 border-surface flex items-center justify-center">
                        {t('timeColumnLabel')}
                      </div>
                      {event.dates.map(dateStr => (
                        <div
                          key={dateStr}
                          className="w-24 sm:w-28 shrink-0 p-2 text-center border-r-2 border-surface last:border-r-0"
                        >
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>
                      ))}
                    </div>

                    {/* Body Rows */}
                    {dayTimes.map(time => (
                      <div key={time} className="flex border-b-2 border-ink last:border-b-0">
                        <div className="w-20 sm:w-24 shrink-0 px-2 py-1.5 text-center font-mono text-xs text-ink border-r-2 border-ink flex items-center justify-center bg-sunken font-bold">
                          {time}
                        </div>

                        {event.dates.map(dateStr => {
                          const slotId = `${dateStr}T${time}`;
                          const isSelected = selectedSet.has(slotId);
                          const isFull = fullSlots.has(slotId) && !isSelected;

                          return (
                            <div
                              key={slotId}
                              // A full cell has no slot id, so a drag passes over it.
                              data-slot-id={isFull ? undefined : slotId}
                              title={isFull ? t('slotFullNote') : undefined}
                              className={`w-24 sm:w-28 h-8 shrink-0 border-r-2 border-ink last:border-r-0 transition-none flex items-center justify-center font-mono text-xs ${
                                isFull
                                  ? 'bg-sunken text-faint cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-accent text-ink font-extrabold border-ink cursor-pointer'
                                  : 'bg-surface hover:bg-sunken text-ink/25 cursor-pointer'
                              }`}
                            >
                              {isFull ? t('slotFullTag') : isSelected ? '[✓]' : '-'}
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
                <div className="p-3 bg-accent border-3 border-ink text-ink font-mono text-xs motion-shake">
                  [ERROR] {errorMsg}
                </div>
              )}

              {/* Success Notification */}
              {saveSuccess && (
                <div className="p-3 bg-sunken border-3 border-ink text-ink font-mono text-xs font-bold motion-pop">
                  [SUCCESS] {t('saveSuccessMsg')}
                </div>
              )}

              {/* Submit Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t-3 border-ink">
                <span className="font-mono text-xs text-ink font-bold">
                  {t('selectedDaysCount', { count: mySelectedSlots.length })}
                </span>

                <button
                  type="submit"
                  disabled={isSaving || isUploading}
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
        <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5 motion-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-ink pb-3">
            <div>
              <h3 className="text-lg font-bold text-ink">
                {t('inspectTitle')}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {t('inspectSubtitle')}
              </p>
            </div>
            <span className="font-mono text-xs uppercase px-2 py-0.5 bg-ink text-surface font-bold shrink-0">
              {participants.length} RESPONSES
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="py-10 text-center space-y-3 border-2 border-dashed border-ink p-5">
              <h4 className="font-bold text-lg text-ink">
                {t('emptyHeatmapTitle')}
              </h4>
              <p className="text-xs text-muted">
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
                <div className="bg-surface p-3 sm:p-5 border-3 border-ink max-w-lg mx-auto">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 border-b-2 border-ink pb-2">
                    <span className="font-bold text-sm text-ink">
                      {monthYearLabel}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="px-2 py-0.5 border-2 border-ink hover:bg-ink hover:text-surface transition-none cursor-pointer"
                      >
                        {t('prevMonthBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="px-2 py-0.5 border-2 border-ink hover:bg-ink hover:text-surface transition-none cursor-pointer"
                      >
                        {t('nextMonthBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers: Sunday first */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 font-mono text-xs font-bold border-b-2 border-ink pb-1">
                    {weekdayHeaders.map((day, idx) => (
                      <div
                        key={`${day}-${idx}`}
                        className={idx === 0 || idx === 6 ? 'text-ink font-extrabold' : 'text-muted'}
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
                            className="aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-line-soft bg-sunken text-faint select-none"
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
                          className={`aspect-square flex flex-col items-center justify-center font-mono text-xs border-2 border-ink transition-none cursor-pointer p-0.5 ${cellStyle} ${
                            isCurrentActive ? 'ring-3 ring-ink z-10' : ''
                          }`}
                        >
                          <span className="font-bold text-xs sm:text-sm">{d.dayNum}</span>
                          <span className={`text-[10px] leading-tight font-extrabold ${isUnanimous ? 'text-ink' : ''}`}>
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
                <div className="border-3 border-ink bg-surface overflow-x-auto select-none pb-1">
                  <div className="min-w-[540px]">
                    <div className="grid grid-cols-5 border-b-3 border-ink bg-ink text-surface font-mono text-xs font-bold p-2 text-center">
                      <div className="text-left pl-2">{t('dateColumnLabel')}</div>
                      <div>{t('partMorning')} <span className="text-[10px] opacity-75">({t('partMorningRange')})</span></div>
                      <div>{t('partAfternoon')} <span className="text-[10px] opacity-75">({t('partAfternoonRange')})</span></div>
                      <div>{t('partEvening')} <span className="text-[10px] opacity-75">({t('partEveningRange')})</span></div>
                      <div>{t('partNight')} <span className="text-[10px] opacity-75">({t('partNightRange')})</span></div>
                    </div>

                    {event.dates.map(dateStr => (
                      <div key={dateStr} className="grid grid-cols-5 border-b-2 border-ink last:border-b-0 items-center">
                        <div className="p-3 font-bold text-xs text-ink border-r-2 border-ink bg-sunken">
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
                              className={`h-11 border-r-2 border-ink last:border-r-0 cursor-pointer transition-none flex flex-col items-center justify-center font-mono text-xs ${cellStyle} ${
                                isHighlighted ? 'outline-4 outline-black z-20' : ''
                              } ${isCurrentActive ? 'border-4 border-ink' : ''}`}
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
                  <div className="min-w-fit inline-block border-3 border-ink bg-surface">
                    {/* Header Row */}
                    <div className="flex border-b-3 border-ink bg-ink text-surface sticky top-0 z-10 font-mono text-xs font-bold">
                      <div className="w-20 sm:w-24 shrink-0 p-2 text-center border-r-2 border-surface flex items-center justify-center">
                        {t('timeColumnLabel')}
                      </div>
                      {event.dates.map(dateStr => (
                        <div
                          key={dateStr}
                          className="w-24 sm:w-28 shrink-0 p-2 text-center border-r-2 border-surface last:border-r-0"
                        >
                          <div>{formatLocalizedDate(dateStr, lang, 'chip')}</div>
                        </div>
                      ))}
                    </div>

                    {/* Body Rows */}
                    {dayTimes.map(time => (
                      <div key={time} className="flex border-b-2 border-ink last:border-b-0">
                        <div className="w-20 sm:w-24 shrink-0 px-2 py-1.5 text-center font-mono text-xs text-ink border-r-2 border-ink flex items-center justify-center bg-sunken font-bold">
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
                              className={`w-24 sm:w-28 h-8 shrink-0 border-r-2 border-ink last:border-r-0 cursor-pointer transition-none flex flex-col items-center justify-center font-mono text-xs ${cellStyle} ${
                                isHighlighted ? 'outline-4 outline-black z-20' : ''
                              } ${isCurrentActive ? 'border-4 border-ink' : ''}`}
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
                <div className="p-4 bg-ink text-surface border-3 border-ink font-sans text-xs space-y-3 motion-enter">
                  <div className="flex items-center justify-between border-b-2 border-surface/40 pb-2">
                    <span className="font-bold text-surface text-sm">
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
                    <span className="font-mono font-bold bg-accent text-ink px-2.5 py-0.5 text-xs">
                      {activeSlotInfo.availableCount}/{activeSlotInfo.totalParticipants} ({activeSlotInfo.percentage}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-on-ink-accent block mb-1.5">
                        {t('confirmedFreeLabel', { count: activeSlotInfo.availableNames.length })}
                      </span>
                      {activeSlotInfo.availableNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlotInfo.availableNames.map(name => (
                            <span key={name} className="px-2 py-0.5 bg-surface text-ink font-semibold">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-surface/60">{t('noneLabel')}</span>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-surface/80 block mb-1.5">
                        {t('busyListLabel', { count: activeSlotInfo.unavailableNames.length })}
                      </span>
                      {activeSlotInfo.unavailableNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlotInfo.unavailableNames.map(name => (
                            <span key={name} className="px-2 py-0.5 bg-muted text-surface">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-on-ink-accent font-bold">{t('allAvailableLabel')}</span>
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
