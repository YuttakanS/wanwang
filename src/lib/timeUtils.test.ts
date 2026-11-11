import { describe, expect, it } from 'vitest';
import { makeEvent, makeParticipant } from '@/test/fixtures';
import {
  participantsHaveSlots,
  computeHeatmap,
  countEventSlots,
  findBestTimeMatches,
  generateAllEventSlots,
  generateShareMessage,
} from './timeUtils';

const URL = 'https://example.test/e/abc123';

describe('countEventSlots', () => {
  // Validation caps events with this count, so it must agree with what is really generated.
  it.each([
    ['day', 60],
    ['daypart', 60],
    ['hour', 60],
    ['hour', 30],
  ] as const)('matches the generated slots for %s at %i minutes', (granularity, slotInterval) => {
    const event = makeEvent({ granularity, slotInterval, startTime: '09:00', endTime: '22:00' });
    expect(countEventSlots(granularity, event.dates.length, event.startTime, event.endTime, slotInterval))
      .toBe(generateAllEventSlots(event).length);
  });
});

describe('computeHeatmap', () => {
  const event = makeEvent();
  const slots = generateAllEventSlots(event);

  it('counts who is available in each slot', () => {
    const heatmap = computeHeatmap(slots, [
      makeParticipant({ id: 'a', name: 'Ann', availability: ['2026-12-01', '2026-12-02'] }),
      makeParticipant({ id: 'b', name: 'Bo', availability: ['2026-12-01'] }),
      makeParticipant({ id: 'c', name: 'Cy', availability: [] }),
    ], 'day');

    expect(heatmap['2026-12-01']).toMatchObject({
      availableCount: 2,
      totalParticipants: 3,
      percentage: 67,
      availableNames: ['Ann', 'Bo'],
      unavailableNames: ['Cy'],
    });
    expect(heatmap['2026-12-03'].availableCount).toBe(0);
  });

  it('reports 0% with no participants', () => {
    expect(computeHeatmap(slots, [], 'day')['2026-12-01'].percentage).toBe(0);
  });
});

describe('findBestTimeMatches', () => {
  const event = makeEvent();
  const participants = [
    makeParticipant({ id: 'a', name: 'Ann', availability: ['2026-12-01', '2026-12-02', '2026-12-03'] }),
    makeParticipant({ id: 'b', name: 'Bo', availability: ['2026-12-02'] }),
  ];

  it('returns nothing without participants', () => {
    expect(findBestTimeMatches(event, [])).toEqual([]);
  });

  it('puts the most available first, then the earliest date', () => {
    const matches = findBestTimeMatches(event, participants);
    expect(matches.map(m => m.date)).toEqual(['2026-12-02', '2026-12-01', '2026-12-03']);
    expect(matches[0]).toMatchObject({ availableCount: 2, percentage: 100, missingNames: [] });
    expect(matches[1]).toMatchObject({ availableCount: 1, percentage: 50, missingNames: ['Bo'] });
  });

  it('honours the limit', () => {
    expect(findBestTimeMatches(event, participants, 1)).toHaveLength(1);
  });
});

describe('generateShareMessage', () => {
  it.each(['th', 'en'] as const)('always includes the title and link in %s', lang => {
    const empty = generateShareMessage(makeEvent(), [], URL, lang);
    const withVotes = generateShareMessage(
      makeEvent(),
      [makeParticipant({ availability: ['2026-12-01'] })],
      URL,
      lang
    );
    for (const message of [empty, withVotes]) {
      expect(message).toContain('Team dinner');
      expect(message).toContain(URL);
    }
    expect(withVotes).toContain('Ann');
  });

  it('never includes secrets', () => {
    const message = generateShareMessage(
      makeEvent({ adminKey: 'ADMIN-SECRET' }),
      [makeParticipant({ editToken: 'EDIT-SECRET', availability: ['2026-12-01'] })],
      URL,
      'en'
    );
    expect(message).not.toContain('ADMIN-SECRET');
    expect(message).not.toContain('EDIT-SECRET');
  });
});

describe('participantsHaveSlots', () => {
  it('counts only answers that picked something', () => {
    expect(participantsHaveSlots([])).toBe(false);
    expect(participantsHaveSlots([makeParticipant({ availability: [] })])).toBe(false);
    expect(participantsHaveSlots([makeParticipant({ availability: [] }), makeParticipant({ availability: ['2026-12-01'] })])).toBe(true);
    expect(participantsHaveSlots([makeParticipant({ availability: undefined as never, availableDates: ['2026-12-01'] })])).toBe(true);
  });
});
