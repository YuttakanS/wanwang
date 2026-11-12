'use client';

import React, { useId, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventCategory, MAX_EVENT_SLOTS, TimeGranularity } from '@/types';
import CategoryPicker from '@/components/CategoryPicker';
import EventExtrasEditor, { EMPTY_EXTRAS, EventExtras, extrasError, extrasToPayload } from '@/components/EventExtrasEditor';
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
  const idBase = useId();

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

  const [extras, setExtras] = useState<EventExtras>(EMPTY_EXTRAS);

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

    const extrasProblem = extrasError(extras);
    if (extrasProblem) {
      setErrorMsg(t(extrasProblem));
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
          ...extrasToPayload(extras),
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
      <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5">
        <div className="border-b-3 border-ink pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">
              {t('step1Title')}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {t('step1Subtitle')}
            </p>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-0.5 bg-ink text-surface shrink-0">
            {t('requiredBadge')}
          </span>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor={`${idBase}-name`} className="block text-sm font-bold text-ink mb-1">
            {t('eventNameLabel')}
          </label>
          <input
            id={`${idBase}-name`}
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('eventNamePlaceholder')}
            className="w-full px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
          />
          <p className="text-xs text-muted mt-1">
            {t('eventNameHelper')}
          </p>
        </div>

        {/* Category Selector */}
        <div>
          <label id={`${idBase}-cat`} className="block text-sm font-bold text-ink mb-1.5">
            {t('categoryLabel')}
          </label>
          <CategoryPicker value={category} onChange={setCategory} labelledBy={`${idBase}-cat`} />
        </div>

        {/* Location & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${idBase}-loc`} className="block text-sm font-bold text-ink mb-1">
              {t('locationLabel')}
            </label>
            <input
              id={`${idBase}-loc`}
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
              className="w-full px-3 py-2 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-xs focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
            />
          </div>

          <div>
            <label htmlFor={`${idBase}-notes`} className="block text-sm font-bold text-ink mb-1">
              {t('notesLabel')}
            </label>
            <input
              id={`${idBase}-notes`}
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-xs focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Date Range Configuration Card */}
      <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5">
        <div className="border-b-3 border-ink pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">
              {t('step2RangeTitle')}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {t('step2RangeSubtitle')}
            </p>
          </div>
          {totalDays > 0 && (
            <span className="font-mono text-xs uppercase px-2 py-1 bg-ink text-on-ink-accent font-bold max-w-full self-start sm:self-center">
              {activePresetPrefix}{t('rangeDaysCount', { count: totalDays, range: formattedRange })}
            </span>
          )}
        </div>

        {/* Shortcuts for Range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink mr-1">{t('shortcutsLabel')}</span>
          {RANGE_PRESETS.map(preset => {
            const isActive = activePreset?.days === preset.days;
            return (
              <button
                key={preset.days}
                type="button"
                aria-pressed={isActive}
                onClick={() => setPresetRange(preset.days)}
                className={`px-3 py-1.5 border-2 border-ink text-xs font-bold transition-none cursor-pointer ${
                  isActive
                    ? 'bg-ink text-on-ink-accent motion-pop'
                    : 'bg-surface text-ink hover:bg-ink hover:text-on-ink-accent'
                }`}
              >
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Custom Start & End Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="min-w-0 max-w-full">
            <label htmlFor={`${idBase}-start`} className="block text-xs font-bold text-ink mb-1">
              {t('rangeStartLabel')}
            </label>
            <input
              id={`${idBase}-start`}
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="block w-full max-w-full min-w-0 box-border px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-mono text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none cursor-pointer"
            />
          </div>

          <div className="min-w-0 max-w-full">
            <label htmlFor={`${idBase}-end`} className="block text-xs font-bold text-ink mb-1">
              {t('rangeEndLabel')}
            </label>
            <input
              id={`${idBase}-end`}
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="block w-full max-w-full min-w-0 box-border px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-mono text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none cursor-pointer"
            />
          </div>
        </div>

        {/* Active Window Summary Chip */}
        {totalDays > 0 && (
          <div className="inline-flex max-w-full items-stretch bg-surface border-2 border-ink overflow-hidden select-none">
            <div className="w-[6px] bg-accent shrink-0" />
            <div className="flex flex-wrap items-center min-w-0 px-3 py-1.5 text-xs text-ink">
              <span className="font-bold mr-1">{t('rangeSummaryLabel')}</span>
              <span className="font-mono font-bold">{startDate}</span>
              <span className="mx-1.5 font-sans font-bold">→</span>
              <span className="font-mono font-bold">{endDate}</span>
              <span className="ml-2 font-mono text-muted font-semibold">
                ({activePresetPrefix}{totalDays} {lang === 'th' ? 'วัน' : 'days'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Time Window Configuration Card */}
      <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-4">
        <div className="border-b-3 border-ink pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">
              {t('step3Title')}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {t('step3Subtitle')}
            </p>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-1 bg-ink text-surface shrink-0 self-start sm:self-center">
            {granularity === 'day' ? t('granularityDay') : granularity === 'daypart' ? t('granularityDaypart') : t('granularityHour')}
          </span>
        </div>

        {/* Segmented Control (3 options, border-2 border-black, active = #FFE500) */}
        <div>
          <label id={`${idBase}-granularity`} className="block text-xs font-bold text-ink mb-1.5">
            {t('granularityLabel')}
          </label>
          <div role="group" aria-labelledby={`${idBase}-granularity`} className="grid grid-cols-3 border-2 border-ink divide-x-2 divide-ink bg-surface select-none">
            <button
              type="button"
              aria-pressed={granularity === 'day'}
              onClick={() => setGranularity('day')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'day'
                  ? 'bg-accent text-ink font-extrabold motion-pop'
                  : 'bg-surface text-ink hover:bg-sunken'
              }`}
            >
              {t('granularityDay')}
            </button>
            <button
              type="button"
              aria-pressed={granularity === 'daypart'}
              onClick={() => setGranularity('daypart')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'daypart'
                  ? 'bg-accent text-ink font-extrabold motion-pop'
                  : 'bg-surface text-ink hover:bg-sunken'
              }`}
            >
              {t('granularityDaypart')}
            </button>
            <button
              type="button"
              aria-pressed={granularity === 'hour'}
              onClick={() => setGranularity('hour')}
              className={`py-2.5 px-2 text-center text-xs sm:text-sm font-bold transition-none cursor-pointer ${
                granularity === 'hour'
                  ? 'bg-accent text-ink font-extrabold motion-pop'
                  : 'bg-surface text-ink hover:bg-sunken'
              }`}
            >
              {t('granularityHour')}
            </button>
          </div>

          {/* Description under control */}
          <div className="mt-2 p-3 bg-sunken border-2 border-ink font-sans text-xs text-ink">
            {granularity === 'day' && t('granularityDayDesc')}
            {granularity === 'daypart' && t('granularityDaypartDesc')}
            {granularity === 'hour' && t('granularityHourDesc')}
          </div>
        </div>

        {/* Hourly Dropdowns (Shown ONLY for hour mode) */}
        {granularity === 'hour' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-2 border-ink">
            <div>
              <label htmlFor={`${idBase}-from`} className="block text-xs font-bold text-ink mb-1">
                {t('startHourLabel')}
              </label>
              <select
                id={`${idBase}-from`}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-sunken border-3 border-ink text-ink font-mono text-xs focus:outline-none focus:border-ink transition-none"
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
              <label htmlFor={`${idBase}-to`} className="block text-xs font-bold text-ink mb-1">
                {t('endHourLabel')}
              </label>
              <select
                id={`${idBase}-to`}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-sunken border-3 border-ink text-ink font-mono text-xs focus:outline-none focus:border-ink transition-none"
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
              <label htmlFor={`${idBase}-interval`} className="block text-xs font-bold text-ink mb-1">
                {t('intervalLabel')}
              </label>
              <select
                id={`${idBase}-interval`}
                value={slotInterval}
                onChange={e => setSlotInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-sunken border-3 border-ink text-ink font-mono text-xs focus:outline-none focus:border-ink transition-none"
              >
                <option value={60}>{t('interval60')}</option>
                <option value={30}>{t('interval30')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Optional: limits and questions */}
      <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-4">
        <div className="border-b-3 border-ink pb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink leading-tight">{t('step4Title')}</h2>
            <p className="text-sm text-muted mt-0.5">{t('step4Subtitle')}</p>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-0.5 border-2 border-ink text-ink shrink-0">
            {t('optionalBadge')}
          </span>
        </div>
        <EventExtrasEditor value={extras} onChange={setExtras} />
      </div>

      {/* New tab: following this link must not lose what was typed. */}
      <p className="text-xs text-muted">
        {t('createVisibilityNote')}{' '}
        <Link href="/privacy" target="_blank" rel="noopener" className="underline hover:text-ink">
          {t('privacyLink')}
        </Link>
      </p>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-surface border-3 border-ink text-ink font-mono text-xs bg-accent motion-shake">
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
        <p className="text-xs text-muted mt-2">
          {t('formFooterNote')}
        </p>
      </div>
    </form>
  );
}
