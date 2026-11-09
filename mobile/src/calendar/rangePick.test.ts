import { describe, expect, it } from 'vitest';
import { isInPickedRange, nextRange } from './rangePick';

describe('nextRange', () => {
  it('starts on the first tap and ends on the second', () => {
    const first = nextRange(null, '2026-12-05');
    expect(first).toEqual({ start: '2026-12-05', end: null });
    expect(nextRange(first, '2026-12-09')).toEqual({ start: '2026-12-05', end: '2026-12-09' });
  });

  it('allows a one-day range', () => {
    expect(nextRange({ start: '2026-12-05', end: null }, '2026-12-05')).toEqual({ start: '2026-12-05', end: '2026-12-05' });
  });

  it('starts again when the second tap is earlier', () => {
    expect(nextRange({ start: '2026-12-05', end: null }, '2026-12-01')).toEqual({ start: '2026-12-01', end: null });
  });

  it('starts again after a finished range', () => {
    expect(nextRange({ start: '2026-12-05', end: '2026-12-09' }, '2026-12-20')).toEqual({ start: '2026-12-20', end: null });
  });
});

describe('isInPickedRange', () => {
  it('includes both ends', () => {
    const range = { start: '2026-12-05', end: '2026-12-09' };
    expect(isInPickedRange(range, '2026-12-05')).toBe(true);
    expect(isInPickedRange(range, '2026-12-09')).toBe(true);
    expect(isInPickedRange(range, '2026-12-10')).toBe(false);
  });

  it('marks only the start while waiting for the end', () => {
    const range = { start: '2026-12-05', end: null };
    expect(isInPickedRange(range, '2026-12-05')).toBe(true);
    expect(isInPickedRange(range, '2026-12-06')).toBe(false);
    expect(isInPickedRange(null, '2026-12-05')).toBe(false);
  });
});
