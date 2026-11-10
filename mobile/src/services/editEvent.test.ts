import { describe, expect, it } from 'vitest';
import type { WanWangEvent } from '@/types';
import { buildEventPatch, type EditEventForm, editEventProblem } from './editEvent';

const TODAY = '2026-11-01';

const event: WanWangEvent = {
  id: 'e1',
  slug: 'abc',
  title: 'Dinner',
  location: 'Home',
  category: 'hangout',
  granularity: 'day',
  dateRangeStart: '2026-11-10',
  dateRangeEnd: '2026-11-12',
  dates: ['2026-11-10', '2026-11-11', '2026-11-12'],
  startTime: '09:00',
  endTime: '17:00',
  slotInterval: 60,
  adminKey: 'k',
  isClosed: false,
  createdAt: '',
  updatedAt: '',
};

const form = (changes: Partial<EditEventForm> = {}): EditEventForm => ({
  title: 'Dinner',
  location: 'Home',
  description: '',
  category: 'hangout',
  range: { start: '2026-11-10', end: '2026-11-12' },
  ...changes,
});

describe('editEventProblem', () => {
  it('accepts the form as it starts', () => {
    expect(editEventProblem(form(), event, true, TODAY)).toBeNull();
  });

  it('needs a title and a finished range', () => {
    expect(editEventProblem(form({ title: '  ' }), event, false, TODAY)?.key).toBe('formErrorTitle');
    expect(editEventProblem(form({ range: { start: '2026-11-10', end: null } }), event, false, TODAY)?.key).toBe('rangePickEnd');
  });

  it('lets the range shrink only before anyone has answered', () => {
    const shrunk = form({ range: { start: '2026-11-11', end: '2026-11-12' } });
    expect(editEventProblem(shrunk, event, false, TODAY)).toBeNull();
    expect(editEventProblem(shrunk, event, true, TODAY)?.key).toBe('editRangeExpandOnly');
    expect(editEventProblem(form({ range: { start: '2026-11-09', end: '2026-11-13' } }), event, true, TODAY)).toBeNull();
  });

  it('caps the range length', () => {
    expect(editEventProblem(form({ range: { start: '2026-01-01', end: '2027-12-31' } }), event, false, TODAY)?.key).toBe('rangeTooLong');
  });
});

describe('buildEventPatch', () => {
  it('sends nothing when nothing changed', () => {
    expect(buildEventPatch(form({ title: ' Dinner ' }), event, TODAY)).toEqual({});
  });

  it('sends only the changed fields, and the range as a pair', () => {
    expect(buildEventPatch(form({ location: '', range: { start: '2026-11-10', end: '2026-11-13' } }), event, TODAY)).toEqual({
      location: '',
      dateRangeStart: '2026-11-10',
      dateRangeEnd: '2026-11-13',
    });
  });
});
