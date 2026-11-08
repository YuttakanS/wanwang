'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EVENT_CATEGORIES, EventCategory, MAX_EVENT_SLOTS, TimeGranularity } from '@/types';
import { countEventSlots, formatLocalizedDateRange, formatDateToISO } from '@/lib/timeUtils';
import { markAdminLinkPending, storeAdminKey } from '@/lib/adminAccess';
import { useI18n } from '@/lib/i18n';

// `days` is added to the start date, so the inclusive count is days + 1.
// 1 year = +365 => 366 inclusive days, the API's LIMITS.maxRangeDays cap.
const RANGE_PRESETS = [
  { days: 14, labelKey: 'rangePreset2Weeks' },
  { days: 30, labelKey: 'rangePreset1Month' },
  { days: 60, labelKey: 'rangePreset2Months' },
  { days: 365, labelKey: 'rangePreset1Year' },
] as const;

const DEFAULT_RANGE_DAYS = 365;

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateToISO(d);
}

export default function CreateEventForm() {
  const router = useRouter();
  const { lang, t } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory>('hangout');
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // Date Range (default: the 1-year preset)
  const [startDate, setStartDate] = useState<string>(() => isoDaysFromToday(0));
  const [endDate, setEndDate] = useState<string>(() => isoDaysFromToday(DEFAULT_RANGE_DAYS));

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('22:00');
  const [slotInterval, setSlotInterval] = useState<number>(60);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  const formattedRange = useMemo(() => {
    if (!startDate || !endDate) return '';
    return formatLocalizedDateRange(startDate, endDate, lang);
  }, [startDate, endDate, lang]);

  const setPresetRange = (days: number) => {
    setStartDate(isoDaysFromToday(0));
    setEndDate(isoDaysFromToday(days));
  };

  // Derived from the dates so the highlight can never disagree with them.
  const activePreset = RANGE_PRESETS.find(
    p => startDate === isoDaysFromToday(0) && endDate === isoDaysFromToday(p.days)
  );
  const activePresetPrefix = activePreset ? `${t(activePreset.labelKey)} • ` : '';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg(t('formErrorTitle'));
      return;
    }

    if (!startDate || !endDate || startDate > endDate) {
      setErrorMsg(lang === 'th' ? 'กรุณาระบุช่วงวันที่ให้ถูกต้อง' : 'Please provide a valid date range');
      return;
    }

    if (countEventSlots(granularity, totalDays, startTime, endTime, slotInterval) > MAX_EVENT_SLOTS) {
      setErrorMsg(t('formErrorTooManySlots'));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim(),
          location: location?.trim(),
          category,
          granularity,
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          durationDays: 1,
          startTime,
          endTime,
          slotInterval,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      if (data.adminKey) {
        storeAdminKey(data.event.slug, data.adminKey);
        markAdminLinkPending(data.event.slug);
      }

      router.push(`/e/${data.event.slug}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Error occurred while creating event');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Event Info Card */}
      <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-5">
        <div className="border-b-3 border-black pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {t('step1Title')}
            </h2>
            <p className="text-sm text-[#525252] mt-0.5">
              {t('step1Subtitle')}
            </p>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-0.5 bg-black text-white shrink-0">
            {t('requiredBadge')}
          </span>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-bold text-black mb-1">
            {t('eventNameLabel')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('eventNamePlaceholder')}
            className="w-full px-3 py-2.5 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-sans text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none"
          />
          <p className="text-xs text-[#525252] mt-1">
            {t('eventNameHelper')}
          </p>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-sm font-bold text-black mb-1.5">
            {t('categoryLabel')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EVENT_CATEGORIES.map(cat => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-2 border-2 border-black text-xs font-semibold text-left transition-none ${
                    isSelected
                      ? 'bg-black text-[#FFE500] motion-pop'
                      : 'bg-white text-black hover:bg-[#F0F0F0]'
                  }`}
                >
                  {getCategoryLabel(cat.id)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              {t('locationLabel')}
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
              className="w-full px-3 py-2 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-sans text-xs focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">
              {t('notesLabel')}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-sans text-xs focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Date Range Configuration Card */}
      <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-5">
        <div className="border-b-3 border-black pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {t('step2RangeTitle')}
            </h2>
            <p className="text-sm text-[#525252] mt-0.5">
              {t('step2RangeSubtitle')}
            </p>
          </div>
          {totalDays > 0 && (
            <span className="font-mono text-xs uppercase px-2 py-1 bg-black text-[#FFE500] font-bold shrink-0 self-start sm:self-center">
              {activePresetPrefix}{t('rangeDaysCount', { count: totalDays, range: formattedRange })}
            </span>
          )}
        </div>

        {/* Shortcuts for Range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-black mr-1">{t('shortcutsLabel')}</span>
          {RANGE_PRESETS.map(preset => {
            const isActive = activePreset?.days === preset.days;
            return (
              <button
                key={preset.days}
                type="button"
                aria-pressed={isActive}
                onClick={() => setPresetRange(preset.days)}
                className={`px-3 py-1.5 border-2 border-black text-xs font-bold transition-none cursor-pointer ${
                  isActive
                    ? 'bg-black text-[#FFE500] motion-pop'
                    : 'bg-white text-black hover:bg-black hover:text-[#FFE500]'
                }`}
              >
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Custom Start & End Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              {t('rangeStartLabel')}
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-mono text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1">
              {t('rangeEndLabel')}
            </label>
            <input
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F0F0F0] hover:bg-[#E8E8E8] border-3 border-black text-black font-mono text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-none cursor-pointer"
            />
          </div>
        </div>

        {/* Active Window Summary Chip */}
        {totalDays > 0 && (
          <div className="inline-flex items-stretch bg-white border-2 border-black overflow-hidden select-none">
            <div className="w-[6px] bg-[#FFE500] shrink-0" />
            <div className="flex items-center px-3 py-1.5 text-xs text-black">
              <span className="font-bold mr-1">{t('rangeSummaryLabel')}</span>
              <span className="font-mono font-bold">{startDate}</span>
              <span className="mx-1.5 font-sans font-bold">→</span>
              <span className="font-mono font-bold">{endDate}</span>
              <span className="ml-2 font-mono text-[#525252] font-semibold">
                ({activePresetPrefix}{totalDays} {lang === 'th' ? 'วัน' : 'days'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Time Window Configuration Card */}
      <div className="bg-white border-3 border-black p-5 sm:p-6 space-y-4">
        <div className="border-b-3 border-black pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black leading-tight">
              {t('step3Title')}
            </h2>
            <p className="text-sm text-[#525252] mt-0.5">
              {t('step3Subtitle')}
            </p>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-1 bg-black text-white shrink-0 self-start sm:self-center">
            {granularity === 'day' ? t('granularityDay') : granularity === 'daypart' ? t('granularityDaypart') : t('granularityHour')}
          </span>
        </div>

        {/* Segmented Control (3 options, border-2 border-black, active = #FFE500) */}
        <div>
          <label className="block text-xs font-bold text-black mb-1.5">
            {t('granularityLabel')}
          </label>
          <div className="grid grid-cols-3 border-2 border-black divide-x-2 divide-black bg-white select-none">
            <button
              type="button"
              onClick={() => setGranularity('day')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'day'
                  ? 'bg-[#FFE500] text-black font-extrabold motion-pop'
                  : 'bg-white text-black hover:bg-[#F0F0F0]'
              }`}
            >
              {t('granularityDay')}
            </button>
            <button
              type="button"
              onClick={() => setGranularity('daypart')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'daypart'
                  ? 'bg-[#FFE500] text-black font-extrabold motion-pop'
                  : 'bg-white text-black hover:bg-[#F0F0F0]'
              }`}
            >
              {t('granularityDaypart')}
            </button>
            <button
              type="button"
              onClick={() => setGranularity('hour')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'hour'
                  ? 'bg-[#FFE500] text-black font-extrabold motion-pop'
                  : 'bg-white text-black hover:bg-[#F0F0F0]'
              }`}
            >
              {t('granularityHour')}
            </button>
          </div>

          {/* Description under control */}
          <div className="mt-2 p-3 bg-[#F0F0F0] border-2 border-black font-sans text-xs text-black">
            {granularity === 'day' && t('granularityDayDesc')}
            {granularity === 'daypart' && t('granularityDaypartDesc')}
            {granularity === 'hour' && t('granularityHourDesc')}
          </div>
        </div>

        {/* Hourly Dropdowns (Shown ONLY for hour mode) */}
        {granularity === 'hour' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-2 border-black">
            <div>
              <label className="block text-xs font-bold text-black mb-1">
                {t('startHourLabel')}
              </label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F0] border-3 border-black text-black font-mono text-xs focus:outline-none focus:border-black transition-none"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const val = `${String(i).padStart(2, '0')}:00`;
                  return (
                    <option key={val} value={val}>
                      {val} {t('hoursSuffix')}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1">
                {t('endHourLabel')}
              </label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#F0F0F0] border-3 border-black text-black font-mono text-xs focus:outline-none focus:border-black transition-none"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = i + 1;
                  const val = hour === 24 ? '23:59' : `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <option key={val} value={val}>
                      {val === '23:59' ? t('midnight') : `${val} ${t('hoursSuffix')}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1">
                {t('intervalLabel')}
              </label>
              <select
                value={slotInterval}
                onChange={e => setSlotInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F0F0F0] border-3 border-black text-black font-mono text-xs focus:outline-none focus:border-black transition-none"
              >
                <option value={60}>{t('interval60')}</option>
                <option value={30}>{t('interval30')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* New tab: following this link must not lose what was typed. */}
      <p className="text-xs text-[#525252]">
        {t('createVisibilityNote')}{' '}
        <Link href="/privacy" target="_blank" rel="noopener" className="underline hover:text-black">
          {t('privacyLink')}
        </Link>
      </p>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-white border-3 border-black text-black font-mono text-xs bg-[#FFE500] motion-shake">
          [ERROR] {errorMsg}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary-raw w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg block mx-auto cursor-pointer"
        >
          {isLoading ? t('submitCreating') : t('submitBtn')}
        </button>
        <p className="text-xs text-[#525252] mt-2">
          {t('formFooterNote')}
        </p>
      </div>
    </form>
  );
}
