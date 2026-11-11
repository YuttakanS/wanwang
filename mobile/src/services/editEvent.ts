import { countEventSlots, generateDatesInRange } from '@/lib/timeUtils';
import { type EventCategory, MAX_EVENT_SLOTS, type WanWangEvent } from '@/types';
import type { DateRange } from '~/calendar/rangePick';
import { MAX_RANGE_DAYS } from '~/constants/limits';
import type { EventPatch } from '~/services/api';
import type { TranslateParams } from '~/constants/strings';

export interface EditEventForm {
  title: string;
  location: string;
  description: string;
  category: EventCategory;
  range: DateRange;
}

export interface FormProblem {
  key: string;
  params?: TranslateParams;
}

/** The range the event was created with, which the form starts from. */
export function initialEventRange(event: WanWangEvent, today: string): { start: string; end: string } {
  const start = event.dateRangeStart || event.dates[0] || today;
  return { start, end: event.dateRangeEnd || event.dates[event.dates.length - 1] || start };
}

/**
 * The first thing that stops the form from saving, or null.
 * Once anyone has answered, the server only lets the range grow, so their slots stay valid.
 */
export function editEventProblem(form: EditEventForm, event: WanWangEvent, hasVotes: boolean, today: string): FormProblem | null {
  const { range } = form;
  if (!form.title.trim()) return { key: 'formErrorTitle' };
  if (!range.end) return { key: 'rangePickEnd' };
  const dayCount = generateDatesInRange(range.start, range.end).length;
  if (dayCount > MAX_RANGE_DAYS) return { key: 'rangeTooLong', params: { max: MAX_RANGE_DAYS } };
  const initial = initialEventRange(event, today);
  if (hasVotes && (range.start > initial.start || range.end < initial.end)) return { key: 'editRangeExpandOnly' };
  const slots = countEventSlots(event.granularity || 'day', dayCount, event.startTime, event.endTime, event.slotInterval);
  if (slots > MAX_EVENT_SLOTS) return { key: 'formErrorTooManySlots' };
  return null;
}

/** Only the fields that changed. The API takes the range only as a pair. */
export function buildEventPatch(form: EditEventForm, event: WanWangEvent, today: string): EventPatch {
  const patch: EventPatch = {};
  const title = form.title.trim();
  const location = form.location.trim();
  const description = form.description.trim();
  if (title !== event.title) patch.title = title;
  if (location !== (event.location ?? '')) patch.location = location;
  if (description !== (event.description ?? '')) patch.description = description;
  if (form.category !== event.category) patch.category = form.category;
  const initial = initialEventRange(event, today);
  if (form.range.end && (form.range.start !== initial.start || form.range.end !== initial.end)) {
    patch.dateRangeStart = form.range.start;
    patch.dateRangeEnd = form.range.end;
  }
  return patch;
}
