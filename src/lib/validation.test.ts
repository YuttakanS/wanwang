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
  validateAnswers,
  validateEventPatch,
  validateParticipantInput,
  validateQuestions,
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
      questions: [],
      maxPerSlot: null,
      maxPicks: null,
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

  it('keeps the picked slots, without duplicates', () => {
    const input = validateParticipantInput({ name: 'Ann', availability: ['2026-12-01', '2026-12-01'] }, event);
    expect(input.availability).toEqual(['2026-12-01']);
  });

  it.each([
    ['missing', {}],
    ['empty', { availability: [] }],
    ['a string', { availability: 'x' }],
    ['an object', { availability: { 0: '2026-12-01' } }],
    ['an empty older availableDates', { availableDates: [] }],
    ['holding a non-string', { availability: ['2026-12-01', 42] }],
    ['holding null', { availability: ['2026-12-01', null] }],
    ['holding a day outside the range', { availability: ['2026-12-01', '2030-01-01'] }],
  ])('rejects availability that is %s', (_name, extra) => {
    expect(() => validateParticipantInput({ name: 'Ann', ...extra }, event)).toThrow(ValidationError);
  });

  it.each([
    ['day', makeEvent({ granularity: 'day' }), '2026-12-02', '2026-12-02T09:00'],
    ['daypart', makeEvent({ granularity: 'daypart' }), '2026-12-02Tevening', '2026-12-02'],
    ['hour', makeEvent({ granularity: 'hour', startTime: '09:00', endTime: '12:00' }), '2026-12-02T11:00', '2026-12-02T12:00'],
  ])('checks slot ids against the %s format', (_name, ev, good, bad) => {
    expect(validateParticipantInput({ name: 'Ann', availability: [good] }, ev).availability).toEqual([good]);
    expect(() => validateParticipantInput({ name: 'Ann', availability: [good, bad] }, ev)).toThrow(ValidationError);
  });

  it('accepts the older availableDates field', () => {
    const input = validateParticipantInput({ name: 'Ann', availableDates: ['2026-12-02'] }, event);
    expect(input.availability).toEqual(['2026-12-02']);
  });

  it('ignores an id or token that is not text', () => {
    const input = validateParticipantInput({ name: 'Ann', id: 1, editToken: {}, availability: ['2026-12-01'] }, event);
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

describe('validateQuestions', () => {
  it('keeps a valid id, gives a new question one, and tidies options', () => {
    const [kept, added] = validateQuestions([
      { id: 'colour01', type: 'choice', label: ' Filament ', required: true, options: [' PLA ', 'PLA', '', 'PETG'] },
      { id: 'not a valid id!', type: 'text', label: 'Notes' },
    ]);

    expect(kept).toEqual({ id: 'colour01', type: 'choice', label: 'Filament', required: true, options: ['PLA', 'PETG'] });
    expect(added).toMatchObject({ type: 'text', label: 'Notes', required: false });
    expect(added.id).toMatch(/^[a-z0-9]{8}$/);
    expect(added).not.toHaveProperty('options');
  });

  it('never returns two questions with the same id', () => {
    const ids = validateQuestions([
      { id: 'same0001', type: 'text', label: 'A' },
      { id: 'same0001', type: 'text', label: 'B' },
    ]).map(q => q.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('treats a missing list as no questions', () => {
    expect(validateQuestions(undefined)).toEqual([]);
  });

  it.each([
    ['something that is not a list', { type: 'text', label: 'A' }],
    ['an unknown type', [{ type: 'rating', label: 'A' }]],
    ['a blank label', [{ type: 'text', label: ' ' }]],
    ['a choice with no options', [{ type: 'choice', label: 'A', options: [' '] }]],
    ['a choice with too many options', [{ type: 'multi', label: 'A', options: Array.from({ length: 21 }, (_, i) => `o${i}`) }]],
    ['too many questions', Array.from({ length: 11 }, () => ({ type: 'text', label: 'A' }))],
  ])('rejects %s', (_name, raw) => {
    expect(() => validateQuestions(raw)).toThrow(ValidationError);
  });
});

describe('limits on an event', () => {
  it('reads a blank limit as no limit', () => {
    expect(validateEventInput({ ...validEvent, maxPerSlot: '', maxPicks: null })).toMatchObject({
      maxPerSlot: null,
      maxPicks: null,
    });
  });

  it.each([0, -1, 1.5, '3', 1001])('rejects %s people per slot', bad => {
    expect(() => validateEventInput({ ...validEvent, maxPerSlot: bad })).toThrow(ValidationError);
  });

  it('lets an edit clear a limit, and leaves limits alone when it does not mention them', () => {
    expect(validateEventPatch({ maxPerSlot: null })).toEqual({ maxPerSlot: null });
    expect(validateEventPatch({ title: 'New' })).toEqual({ title: 'New' });
  });
});

describe('validateAnswers', () => {
  const EVENT_ID = '11111111-1111-4111-8111-111111111111';
  const FILE = `${EVENT_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.stl`;
  const ev = makeEvent({
    id: EVENT_ID,
    questions: [
      { id: 'text0001', type: 'text', label: 'Notes', required: false },
      { id: 'multi001', type: 'multi', label: 'Colours', required: false, options: ['Red', 'Blue'] },
      { id: 'file0001', type: 'file', label: 'Model', required: true },
    ],
  });
  const file = { path: FILE, name: 'part.stl', size: 12 };

  it('keeps each kind of answer and leaves out the ones not given', () => {
    expect(validateAnswers({ multi001: ['Blue', 'Blue', 'Red'], file0001: { ...file, extra: 'dropped' } }, ev)).toEqual({
      multi001: ['Blue', 'Red'],
      file0001: file,
    });
  });

  it('trims text and treats blank text as not answered', () => {
    expect(validateAnswers({ text0001: '  ', file0001: file }, ev)).toEqual({ file0001: file });
    expect(validateAnswers({ text0001: ' hi ', file0001: file }, ev).text0001).toBe('hi');
  });

  it.each([
    ['a required question with no answer', {}],
    ['an option that is not offered', { file0001: file, multi001: ['Green'] }],
    ['text over the limit', { file0001: file, text0001: 'x'.repeat(1001) }],
    ['a file path with extra folders', { file0001: { ...file, path: `${EVENT_ID}/../${FILE}` } }],
    ['a file with no name', { file0001: { path: FILE } }],
  ])('rejects %s', (_name, answers) => {
    expect(() => validateAnswers(answers, ev)).toThrow(ValidationError);
  });

  it('returns nothing for an event with no questions, whatever is sent', () => {
    expect(validateAnswers({ anything: 'x' }, makeEvent())).toEqual({});
  });
});
