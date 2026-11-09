import { describe, expect, it } from 'vitest';
import { generateAllEventSlots, generateDatesInRange, generateDayTimeSlots } from '@/lib/timeUtils';
import type { TimeGranularity, WanWangEvent } from '@/types';
import { MAX_MASK_CELLS } from './cellMask';
import { DAY_PART_IDS, dayColumnLabel, datesOnPage, daypartSlotId, DAYS_PER_PAGE, hourCells, initialPage, pageCount, pageOfDate } from './slotPages';

const dates = generateDatesInRange('2026-12-01', '2026-12-16'); // 16 days

function event(granularity: TimeGranularity, overrides: Partial<WanWangEvent> = {}): WanWangEvent {
  return { granularity, dates: dates.slice(0, 3), startTime: '09:00', endTime: '11:00', slotInterval: 60, ...overrides } as WanWangEvent;
}

describe('paging', () => {
  it('splits dates into weeks, with a short last page', () => {
    expect(pageCount(dates)).toBe(3);
    expect(datesOnPage(dates, 0)).toHaveLength(7);
    expect(datesOnPage(dates, 0)[0]).toBe('2026-12-01');
    expect(datesOnPage(dates, 2)).toEqual(['2026-12-15', '2026-12-16']);
  });

  it('always has a page, even with no dates', () => {
    expect(pageCount([])).toBe(1);
    expect(datesOnPage([], 0)).toEqual([]);
  });

  it('finds the page of a date', () => {
    expect(pageOfDate(dates, '2026-12-07')).toBe(0);
    expect(pageOfDate(dates, '2026-12-08')).toBe(1);
    expect(pageOfDate(dates, '2030-01-01')).toBe(0);
  });

  it('opens on today, or the next day in the event', () => {
    expect(initialPage(dates, '2026-11-01')).toBe(0);
    expect(initialPage(dates, '2026-12-09')).toBe(1);
    expect(initialPage(['2026-12-01', '2026-12-20'], '2026-12-10')).toBe(0);
  });

  it('opens on the last page of an event that has ended', () => {
    expect(initialPage(dates, '2027-01-01')).toBe(2);
  });
});

describe('slot ids', () => {
  it('match the ids the server accepts for hourly events', () => {
    const times = generateDayTimeSlots('09:00', '11:00', 60);
    const ids = hourCells(dates.slice(0, 3), times, '2026-01-01');
    expect(new Set(ids)).toEqual(new Set(generateAllEventSlots(event('hour')).map(slot => slot.id)));
  });

  it('match the ids the server accepts for daypart events', () => {
    const ids = dates.slice(0, 3).flatMap(date => DAY_PART_IDS.map(part => daypartSlotId(date, part)));
    expect(new Set(ids)).toEqual(new Set(generateAllEventSlots(event('daypart')).map(slot => slot.id)));
  });

  it('are row by row, so a cell index can find its slot', () => {
    const cells = hourCells(['2026-12-01', '2026-12-02'], ['09:00', '10:00'], '2026-01-01');
    expect(cells).toEqual(['2026-12-01T09:00', '2026-12-02T09:00', '2026-12-01T10:00', '2026-12-02T10:00']);
  });

  it('leave past days out', () => {
    const cells = hourCells(['2026-12-01', '2026-12-02'], ['09:00'], '2026-12-02');
    expect(cells).toEqual([null, '2026-12-02T09:00']);
  });
});

describe('dayColumnLabel', () => {
  it('shows the weekday over the day', () => {
    expect(dayColumnLabel('2026-12-07', 'th').split('\n')).toEqual(['จ.', '7']);
    expect(dayColumnLabel('2026-12-06', 'en').split('\n')).toEqual(['Sun', '6']);
  });
});

describe('the largest page', () => {
  it('fits in the selection mask', () => {
    const times = generateDayTimeSlots('00:00', '23:59', 30);
    expect(times).toHaveLength(48);
    expect(times.length * DAYS_PER_PAGE).toBeLessThanOrEqual(MAX_MASK_CELLS);
  });
});
