'use client';

import React, { useId, useState } from 'react';
import { EventCategory, MAX_EVENT_SLOTS, WanWangEvent } from '@/types';
import { countEventSlots, formatLocalizedDateRange } from '@/lib/timeUtils';
import { getStoredAdminKey } from '@/lib/adminAccess';
import { useI18n } from '@/lib/i18n';
import CategoryPicker from '@/components/CategoryPicker';
import EventExtrasEditor, { extrasError, extrasFromEvent, extrasToPayload } from '@/components/EventExtrasEditor';

interface EditEventFormProps {
  event: WanWangEvent;
  /** Once anyone has answered, the server only lets the range grow, so their slots stay valid. */
  hasVotes: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

const inputClass =
  'block w-full max-w-full min-w-0 box-border px-3 py-2 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none';

export default function EditEventForm({ event, hasVotes, onSaved, onCancel }: EditEventFormProps) {
  const { lang, t } = useI18n();
  const idBase = useId();

  const initialStart = event.dateRangeStart || event.dates[0];
  const initialEnd = event.dateRangeEnd || event.dates[event.dates.length - 1];

  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? '');
  const [description, setDescription] = useState(event.description ?? '');
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [initialExtras] = useState(() => extrasFromEvent(event));
  const [extras, setExtras] = useState(initialExtras);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const rangeValid = Boolean(startDate && endDate && startDate <= endDate);
  // Counted from the timestamps: a mistyped year must not build a list of every date in between.
  const totalDays = rangeValid ? Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1 : 0;

  const buildPatch = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    if (title.trim() !== event.title) patch.title = title.trim();
    if (location.trim() !== (event.location ?? '')) patch.location = location.trim();
    if (description.trim() !== (event.description ?? '')) patch.description = description.trim();
    if (category !== event.category) patch.category = category;
    // The API takes the range only as a pair.
    if (startDate !== initialStart || endDate !== initialEnd) {
      patch.dateRangeStart = startDate;
      patch.dateRangeEnd = endDate;
    }
    // Each part is sent only if it changed, as with the fields above.
    const before = extrasToPayload(initialExtras);
    const after = extrasToPayload(extras);
    if (after.maxPerSlot !== before.maxPerSlot) patch.maxPerSlot = after.maxPerSlot;
    // Against the stored value, not the form's starting value: an older limited event has no
    // per-person limit stored, and saving it should give it the default of 1.
    if (after.maxPicks !== (event.maxPicks ?? null)) patch.maxPicks = after.maxPicks;
    if (JSON.stringify(after.questions) !== JSON.stringify(before.questions)) patch.questions = after.questions;
    return patch;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg(t('formErrorTitle'));
      return;
    }
    if (!rangeValid) {
      setErrorMsg(t('editRangeInvalid'));
      return;
    }
    if (hasVotes && (startDate > initialStart || endDate < initialEnd)) {
      setErrorMsg(t('editRangeExpandOnly'));
      return;
    }
    if (countEventSlots(event.granularity || 'day', totalDays, event.startTime, event.endTime, event.slotInterval) > MAX_EVENT_SLOTS) {
      setErrorMsg(t('formErrorTooManySlots'));
      return;
    }
    const extrasProblem = extrasError(extras);
    if (extrasProblem) {
      setErrorMsg(t(extrasProblem));
      return;
    }

    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    const adminKey = event.adminKey || getStoredAdminKey(event.slug);
    if (!adminKey) {
      setErrorMsg(t('editEventFailed'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('editEventFailed'));
      onSaved();
    } catch (err) {
      setErrorMsg((err as Error)?.message || t('editEventFailed'));
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${idBase}-title`}
      className="w-full p-4 bg-surface border-3 border-ink space-y-4 motion-enter"
    >
      <h2 id={`${idBase}-title`} className="text-lg font-bold text-ink">
        {t('editEventTitle')}
      </h2>

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
          className={inputClass}
        />
      </div>

      <div>
        <span id={`${idBase}-cat`} className="block text-sm font-bold text-ink mb-1.5">{t('categoryLabel')}</span>
        <CategoryPicker value={category} onChange={setCategory} labelledBy={`${idBase}-cat`} />
      </div>

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
            className={inputClass}
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
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label htmlFor={`${idBase}-start`} className="block text-xs font-bold text-ink mb-1">
            {t('rangeStartLabel')}
          </label>
          <input
            id={`${idBase}-start`}
            type="date"
            required
            max={hasVotes ? initialStart : endDate}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={`${inputClass} font-mono cursor-pointer`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idBase}-end`} className="block text-xs font-bold text-ink mb-1">
            {t('rangeEndLabel')}
          </label>
          <input
            id={`${idBase}-end`}
            type="date"
            required
            min={hasVotes ? initialEnd : startDate}
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={`${inputClass} font-mono cursor-pointer`}
          />
        </div>
      </div>
      {rangeValid && (
        <p className="font-mono text-xs text-muted">
          {t('rangeDaysCount', {
            count: totalDays,
            range: formatLocalizedDateRange(startDate, endDate, lang),
          })}
        </p>
      )}
      {hasVotes && <p className="text-xs text-muted">{t('editRangeExpandOnly')}</p>}

      <div className="border-t-3 border-ink pt-4 space-y-3">
        <EventExtrasEditor value={extras} onChange={setExtras} />
        {hasVotes && <p className="text-xs text-muted">{t('editExtrasWithVotesNote')}</p>}
      </div>

      {errorMsg && (
        <p role="alert" className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {errorMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="btn-primary-raw px-4 py-2 text-sm font-bold">
          {isSaving ? t('savingChangesBtn') : t('saveChangesBtn')}
        </button>
        <button type="button" disabled={isSaving} onClick={onCancel} className="btn-secondary-raw px-4 py-2 text-sm font-semibold">
          {t('confirmCancelBtn')}
        </button>
      </div>
    </form>
  );
}
