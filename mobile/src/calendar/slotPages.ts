import type { Language } from '@/lib/translations';
import { getWeekdayHeaders } from '@/lib/timeUtils';
import type { DayPartId } from '@/types';

/**
 * Daypart and hourly events show a week at a time. A page then has at most 336 cells, however long
 * the event is, so a year-long event needs neither two-way scrolling nor a virtualized list.
 */
export const DAYS_PER_PAGE = 7;

export const DAY_PART_IDS: DayPartId[] = ['morning', 'afternoon', 'evening', 'night'];

export function pageCount(dates: readonly string[]): number {
  return Math.max(1, Math.ceil(dates.length / DAYS_PER_PAGE));
}

export function datesOnPage(dates: readonly string[], page: number): string[] {
  return dates.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);
}

export function pageOfDate(dates: readonly string[], date: string): number {
  const index = dates.indexOf(date);
  return index < 0 ? 0 : Math.floor(index / DAYS_PER_PAGE);
}

/** Opens on the page holding today, or the first day after it, because earlier ones cannot be chosen. */
export function initialPage(dates: readonly string[], today: string): number {
  const index = dates.findIndex(date => date >= today);
  return index < 0 ? pageCount(dates) - 1 : Math.floor(index / DAYS_PER_PAGE);
}

// Slot ids must match the website's: see generateAllEventSlots in src/lib/timeUtils.ts.
export function daypartSlotId(date: string, part: DayPartId): string {
  return `${date}T${part}`;
}

export function hourSlotId(date: string, time: string): string {
  return `${date}T${time}`;
}

/** Row by row, the order the grid's touch arithmetic expects. Past days cannot be chosen. */
export function hourCells(dates: readonly string[], times: readonly string[], today: string): (string | null)[] {
  return times.flatMap(time => dates.map(date => (date >= today ? hourSlotId(date, time) : null)));
}

/** Two short lines for a narrow column, such as "จ." over "9/12". */
export function dayColumnLabel(date: string, lang: Language): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${getWeekdayHeaders(lang)[new Date(year, month - 1, day).getDay()]}\n${day}/${month}`;
}
