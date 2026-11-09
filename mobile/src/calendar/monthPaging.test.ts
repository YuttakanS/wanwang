import { describe, expect, it } from 'vitest';
import { canShowMonth, initialMonth } from './monthPaging';

const month = (date: Date) => [date.getFullYear(), date.getMonth() + 1];

describe('initialMonth', () => {
  it('opens on the first month of a range that has not started', () => {
    expect(month(initialMonth('2027-02-10', '2027-03-10', '2026-11-09'))).toEqual([2027, 2]);
  });

  it('opens on the current month of a range already running', () => {
    expect(month(initialMonth('2026-10-01', '2027-03-10', '2026-11-09'))).toEqual([2026, 11]);
  });

  it('opens on the last month of a range that has ended', () => {
    expect(month(initialMonth('2026-01-01', '2026-03-10', '2026-11-09'))).toEqual([2026, 3]);
  });
});

describe('canShowMonth', () => {
  it('allows the months the range touches, across a new year', () => {
    expect(canShowMonth(new Date(2026, 11, 1), '2026-12-31', '2027-01-01')).toBe(true);
    expect(canShowMonth(new Date(2027, 0, 1), '2026-12-31', '2027-01-01')).toBe(true);
  });

  it('refuses months outside it', () => {
    expect(canShowMonth(new Date(2026, 10, 1), '2026-12-31', '2027-01-01')).toBe(false);
    expect(canShowMonth(new Date(2027, 1, 1), '2026-12-31', '2027-01-01')).toBe(false);
  });
});
