import { describe, expect, it } from 'vitest';
import { mergeMyEvents, parseKnownEvents, withKnownEvent } from './myEventsList';

describe('parseKnownEvents', () => {
  it('survives missing or damaged storage', () => {
    expect(parseKnownEvents(null)).toEqual([]);
    expect(parseKnownEvents('not json')).toEqual([]);
    expect(parseKnownEvents('{"slug":"a"}')).toEqual([]);
  });

  it('drops entries of the wrong shape', () => {
    expect(parseKnownEvents('[{"slug":"a","title":"A"},{"slug":1},null]')).toEqual([{ slug: 'a', title: 'A' }]);
  });
});

describe('withKnownEvent', () => {
  it('moves an event to the top without a duplicate, and shows it again if hidden', () => {
    const events = [
      { slug: 'a', title: 'A' },
      { slug: 'b', title: 'B', hidden: true },
    ];
    expect(withKnownEvent(events, 'b', 'New title')).toEqual([
      { slug: 'b', title: 'New title' },
      { slug: 'a', title: 'A' },
    ]);
  });
});

describe('mergeMyEvents', () => {
  const known = [
    { slug: 'a', title: 'Old title' },
    { slug: 'b', title: 'Voted on' },
  ];

  it('prefers what the server says', () => {
    const [first] = mergeMyEvents(known, new Set(['a']), [
      { slug: 'a', title: 'New title', isClosed: true, createdAt: '', participantCount: 3 },
    ]);
    expect(first).toMatchObject({ title: 'New title', isAdmin: true, isClosed: true, participantCount: 3 });
  });

  it('keeps events the lookup did not return', () => {
    const merged = mergeMyEvents(known, new Set(['a']), []);
    expect(merged.map(e => e.title)).toEqual(['Old title', 'Voted on']);
    expect(merged[1].isAdmin).toBe(false);
  });
});
