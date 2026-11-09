import { describe, expect, it } from 'vitest';
import { MAX_EVENT_SLOTS } from '@/types';
import { makeEvent } from '@/test/fixtures';
import {
  LIMITS,
  ValidationError,
  generateSlug,
  hashSecret,
  isValidDate,
  rangeDays,
  validateEventInput,
  validateEventPatch,
  validateParticipantInput,
  validateRange,
  verifySecret,
} from './validation';

const validEvent = {
  title: 'Team dinner',
  dateRangeStart: '2026-12-01',
  dateRangeEnd: '2026-12-03',
};

describe('verifySecret', () => {
  const stored = hashSecret('right-key');

  it('accepts the matching secret', () => {
    expect(verifySecret('right-key', stored)).toBe(true);
  });

  it('rejects a wrong or missing secret', () => {
    expect(verifySecret('wrong-key', stored)).toBe(false);
    expect(verifySecret('', stored)).toBe(false);
    expect(verifySecret(null, stored)).toBe(false);
    expect(verifySecret(undefined, stored)).toBe(false);
  });

  it('rejects when nothing is stored', () => {
    expect(verifySecret('right-key', null)).toBe(false);
    expect(verifySecret('right-key', '')).toBe(false);
  });

  it('does not accept the stored hash as the secret', () => {
    expect(verifySecret(stored, stored)).toBe(false);
  });
});

describe('generateSlug', () => {
  it('uses only unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateSlug()).toMatch(/^[a-km-np-z2-9]{10}$/);
    }
  });
});

describe('isValidDate', () => {
  it('accepts real dates', () => {
    expect(isValidDate('2026-12-31')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
  });

  it('rejects impossible dates and other formats', () => {
    for (const value of ['2026-02-30', '2025-02-29', '2026-13-01', '26-1-1', '2026/12/01', '', null, 20261201]) {
      expect(isValidDate(value)).toBe(false);
    }
  });
});

describe('validateRange', () => {
  it('counts both end dates', () => {
    expect(rangeDays('2026-12-01', '2026-12-01')).toBe(1);
    expect(rangeDays('2026-02-28', '2026-03-01')).toBe(2);
  });

  it('rejects an end before the start', () => {
    expect(() => validateRange('2026-12-02', '2026-12-01')).toThrow(ValidationError);
  });

  it('allows the maximum range and rejects one day more', () => {
    expect(rangeDays('2026-01-01', '2027-01-01')).toBe(LIMITS.maxRangeDays);
    expect(() => validateRange('2026-01-01', '2027-01-01')).not.toThrow();
    expect(() => validateRange('2026-01-01', '2027-01-02')).toThrow(ValidationError);
  });
});

describe('validateEventInput', () => {
  it('trims text and applies defaults', () => {
    expect(validateEventInput({ ...validEvent, title: '  Team dinner  ' })).toEqual({
      title: 'Team dinner',
      description: '',
      location: '',
      category: 'general',
      granularity: 'day',
      dateRangeStart: '2026-12-01',
      dateRangeEnd: '2026-12-03',
      startTime: '09:00',
      endTime: '22:00',
      slotInterval: 60,
    });
  });

  it.each([
    ['a missing title', { title: undefined }],
    ['a blank title', { title: '   ' }],
    ['a title that is not text', { title: 123 }],
    ['a title over the limit', { title: 'x'.repeat(LIMITS.title + 1) }],
    ['a description over the limit', { description: 'x'.repeat(LIMITS.description + 1) }],
    ['a location over the limit', { location: 'x'.repeat(LIMITS.location + 1) }],
    ['an unknown category', { category: 'nope' }],
    ['a category that is not text', { category: ['general'] }],
    ['an unknown granularity', { granularity: 'minute' }],
    ['a badly formed start time', { startTime: '25:00' }],
    ['a start time that is not text', { startTime: ['09:00'] }],
    ['an end time that is not text', { endTime: ['22:00'] }],
    ['a start time at the end time', { startTime: '10:00', endTime: '10:00' }],
    ['an unsupported slot interval', { slotInterval: 15 }],
  ])('rejects %s', (_name, overrides) => {
    expect(() => validateEventInput({ ...validEvent, ...overrides })).toThrow(ValidationError);
  });

  it('caps the number of slots', () => {
    const body = {
      title: 'Long',
      granularity: 'hour',
      dateRangeStart: '2026-01-01',
      dateRangeEnd: '2027-01-01',
      startTime: '00:00',
      endTime: '23:30',
      slotInterval: 30,
    };
    expect(366 * 47).toBeGreaterThan(MAX_EVENT_SLOTS);
    expect(() => validateEventInput(body)).toThrow(/Too many time slots/);
  });
});

describe('validateEventPatch', () => {
  it('drops fields a client must not set', () => {
    const patch = validateEventPatch({
      title: 'New title',
      id: 'other-id',
      slug: 'other-slug',
      adminKey: 'attacker-key',
      admin_key: 'attacker-key',
      dates: ['2030-01-01'],
    });
    expect(patch).toEqual({ title: 'New title' });
  });

  it('allows clearing the confirmed date', () => {
    expect(validateEventPatch({ confirmedDate: '' })).toEqual({ confirmedDate: '' });
  });

  it.each([
    ['a blank title', { title: ' ' }],
    ['a non-boolean isClosed', { isClosed: 'true' }],
    ['an unknown category', { category: 'nope' }],
    ['an unknown granularity', { granularity: 'minute' }],
    ['a confirmed date that is not text', { confirmedDate: 123 }],
    ['half a date range', { dateRangeStart: '2026-12-01' }],
    ['a reversed date range', { dateRangeStart: '2026-12-02', dateRangeEnd: '2026-12-01' }],
  ])('rejects %s', (_name, body) => {
    expect(() => validateEventPatch(body)).toThrow(ValidationError);
  });
});

describe('validateParticipantInput', () => {
  const event = makeEvent();

  it('keeps only real slots of this event, without duplicates', () => {
    const input = validateParticipantInput(
      { name: 'Ann', availability: ['2026-12-01', '2026-12-01', '2030-01-01', 42, null] },
      event
    );
    expect(input.availability).toEqual(['2026-12-01']);
  });

  it('accepts the older availableDates field', () => {
    const input = validateParticipantInput({ name: 'Ann', availableDates: ['2026-12-02'] }, event);
    expect(input.availability).toEqual(['2026-12-02']);
  });

  it('ignores an id or token that is not text', () => {
    const input = validateParticipantInput({ name: 'Ann', id: 1, editToken: {} }, event);
    expect(input.id).toBeUndefined();
    expect(input.editToken).toBeUndefined();
  });

  it('rejects a missing or overlong name, overlong note, and too many slots', () => {
    expect(() => validateParticipantInput({ name: ' ' }, event)).toThrow(ValidationError);
    expect(() => validateParticipantInput({ name: 'x'.repeat(LIMITS.name + 1) }, event)).toThrow(ValidationError);
    expect(() => validateParticipantInput({ name: 'Ann', note: 'x'.repeat(LIMITS.note + 1) }, event)).toThrow(ValidationError);
    const tooMany = Array.from({ length: LIMITS.maxSlots + 1 }, () => '2026-12-01');
    expect(() => validateParticipantInput({ name: 'Ann', availability: tooMany }, event)).toThrow(ValidationError);
  });
});
