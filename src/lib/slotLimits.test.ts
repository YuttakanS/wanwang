import { describe, expect, it } from 'vitest';
import { answersToSend, firstUnanswered } from './answers';
import { fullSlotsFor, sameSlots, slotsTakenByOthers, withinLimits } from './slotLimits';
import type { EventQuestion } from '@/types';

const people = [
  { id: 'a', availability: ['d1', 'd2'] },
  { id: 'b', availability: ['d1'] },
  { id: 'me', availability: ['d1'] },
];

describe('slotsTakenByOthers', () => {
  it('counts everyone but me', () => {
    expect(Object.fromEntries(slotsTakenByOthers(people, 'me', 2))).toEqual({ d1: 2, d2: 1 });
  });

  it('counts everyone when I have no answer yet', () => {
    expect(slotsTakenByOthers(people, null, 2).get('d1')).toBe(3);
  });

  it('is empty when the event has no limit', () => {
    expect(slotsTakenByOthers(people, 'me', null).size).toBe(0);
  });

  it('reads the older availableDates field', () => {
    expect(slotsTakenByOthers([{ id: 'x', availableDates: ['d9'] }], null, 1).get('d9')).toBe(1);
  });
});

describe('fullSlotsFor', () => {
  it('marks a slot at the limit', () => {
    expect([...fullSlotsFor(people, null, 2)]).toEqual(['d1']);
  });

  it('never marks a slot I already hold, so I can edit my answer', () => {
    expect(fullSlotsFor(people, 'me', 2).size).toBe(0);
  });

  it('marks a slot I do not hold', () => {
    const others = [...people, { id: 'c', availability: ['d2'] }];
    expect([...fullSlotsFor(others, 'me', 2)]).toEqual(['d2']);
  });
});

describe('sameSlots', () => {
  it('compares members, not objects or order', () => {
    expect(sameSlots(new Set(['d1', 'd2']), new Set(['d2', 'd1']))).toBe(true);
    expect(sameSlots(new Set(), new Set())).toBe(true);
  });

  it('tells a different, a larger and a smaller set apart', () => {
    expect(sameSlots(new Set(['d1']), new Set(['d2']))).toBe(false);
    expect(sameSlots(new Set(['d1']), new Set(['d1', 'd2']))).toBe(false);
    expect(sameSlots(new Set(['d1', 'd2']), new Set(['d1']))).toBe(false);
  });
});

describe('withinLimits', () => {
  const none = new Set<string>();

  it('drops full slots from what is added', () => {
    expect(withinLimits([], ['d1', 'd2'], new Set(['d1']), null)).toEqual(['d2']);
  });

  it('adds only as many as the per-person limit leaves room for', () => {
    expect(withinLimits(['d1'], ['d1', 'd2', 'd3'], none, 2)).toEqual(['d1', 'd2']);
    expect(withinLimits(['d1', 'd2'], ['d1', 'd2', 'd3'], none, 2)).toEqual(['d1', 'd2']);
  });

  it('lets a slot be removed at the limit', () => {
    expect(withinLimits(['d1', 'd2'], ['d1'], none, 2)).toEqual(['d1']);
  });

  it('keeps a chosen slot that has since filled up, since removing it is the caller’s call', () => {
    expect(withinLimits(['d1'], ['d1', 'd2'], new Set(['d1']), null)).toEqual(['d1', 'd2']);
  });

  it('returns the same array when nothing changes', () => {
    const prev = ['d1'];
    expect(withinLimits(prev, ['d1', 'd2'], none, 1)).toBe(prev);
  });
});

const questions: EventQuestion[] = [
  { id: 'q1', type: 'text', label: 'Diet', required: true },
  { id: 'q2', type: 'choice', label: 'Size', required: false, options: ['S', 'M'] },
  { id: 'q3', type: 'multi', label: 'Days', required: true, options: ['Sat', 'Sun'] },
  { id: 'q4', type: 'file', label: 'Photo', required: false },
];

describe('firstUnanswered', () => {
  it('finds the first required question without an answer', () => {
    expect(firstUnanswered(questions, {})?.id).toBe('q1');
    expect(firstUnanswered(questions, { q1: '  ' })?.id).toBe('q1');
    expect(firstUnanswered(questions, { q1: 'none' })?.id).toBe('q3');
    expect(firstUnanswered(questions, { q1: 'none', q3: [] })?.id).toBe('q3');
  });

  it('is null once every required question is answered', () => {
    expect(firstUnanswered(questions, { q1: 'none', q3: ['Sat'] })).toBeNull();
  });
});

describe('answersToSend', () => {
  it('trims text and drops blanks', () => {
    expect(answersToSend(questions, { q1: '  vegan ', q2: '' })).toEqual({ q1: 'vegan' });
  });

  it('drops options the question no longer offers', () => {
    expect(answersToSend(questions, { q2: 'XL', q3: ['Sat', 'Mon'] })).toEqual({ q3: ['Sat'] });
    expect(answersToSend(questions, { q3: ['Mon'] })).toEqual({});
  });

  it('keeps an attached file as it is', () => {
    const file = { path: 'ev/f.png', name: 'f.png', size: 10 };
    expect(answersToSend(questions, { q4: file })).toEqual({ q4: file });
  });

  it('drops answers to questions the event no longer asks', () => {
    expect(answersToSend(questions, { gone: 'x' })).toEqual({});
  });
});
