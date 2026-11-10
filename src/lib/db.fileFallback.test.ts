import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeParticipant } from '@/test/fixtures';
import { hashSecret } from './validation';

// In memory, so these tests can never touch the real data/ folder.
const files = vi.hoisted(() => new Map<string, string>());

vi.mock('fs/promises', () => {
  const api = {
    mkdir: vi.fn(async () => undefined),
    access: vi.fn(async () => undefined),
    readFile: vi.fn(async (file: string) => files.get(file.replace(/\\/g, '/').split('/').pop()!) ?? '[]'),
    writeFile: vi.fn(async (file: string, text: string) => {
      files.set(file.replace(/\\/g, '/').split('/').pop()!, text);
    }),
  };
  return { default: api, ...api };
});

vi.mock('./supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  shouldUseSupabase: () => false,
}));

import { updateEvent } from './db';

const KEY = 'admin-key';

function seed(overrides = {}) {
  const event = makeEvent({
    adminKey: hashSecret(KEY),
    granularity: 'hour',
    startTime: '00:00',
    endTime: '23:30',
    slotInterval: 30,
    dateRangeStart: '2026-01-01',
    dateRangeEnd: '2026-01-02',
    dates: ['2026-01-01', '2026-01-02'],
    ...overrides,
  });
  files.set('events.json', JSON.stringify([event]));
  return event;
}

const stored = () => JSON.parse(files.get('events.json')!)[0];

describe('updateEvent slot cap without Supabase', () => {
  beforeEach(() => {
    files.clear();
  });

  it('refuses widening the range past the cap, and saves nothing', async () => {
    seed();

    await expect(updateEvent('abc123', KEY, { dateRangeStart: '2026-01-01', dateRangeEnd: '2026-12-31' }))
      .rejects.toThrow(/Too many time slots/);
    expect(stored().dateRangeEnd).toBe('2026-01-02');
  });

  it('refuses making slots finer past the cap, and saves nothing', async () => {
    const dates = Array.from({ length: 300 }, (_, i) => `d${i}`);
    seed({ granularity: 'day', dates });

    await expect(updateEvent('abc123', KEY, { granularity: 'hour' })).rejects.toThrow(/Too many time slots/);
    expect(stored().granularity).toBe('day');
  });

  it('allows an edit that stays under the cap', async () => {
    seed();

    await updateEvent('abc123', KEY, { dateRangeStart: '2026-01-01', dateRangeEnd: '2026-01-10' });

    expect(stored().dates).toHaveLength(10);
  });
});

describe('updateEvent range changes without Supabase', () => {
  const range = { dateRangeStart: '2026-01-02', dateRangeEnd: '2026-01-03' };

  beforeEach(() => {
    files.clear();
  });

  it('clears a confirmed date that the new range leaves out', async () => {
    seed({ confirmedDate: '2026-01-01' });

    const updated = await updateEvent('abc123', KEY, range);

    expect(updated?.confirmedDate).toBeUndefined();
    expect(stored().confirmedDate).toBeUndefined();
  });

  it('keeps a confirmed date that is still in the new range', async () => {
    seed({ confirmedDate: '2026-01-02' });

    await updateEvent('abc123', KEY, range);

    expect(stored().confirmedDate).toBe('2026-01-02');
  });

  it('allows shrinking when every answer has no slots', async () => {
    seed();
    files.set('participants.json', JSON.stringify([makeParticipant({ availability: [] })]));

    await updateEvent('abc123', KEY, range);

    expect(stored().dates).toEqual(['2026-01-02', '2026-01-03']);
  });

  it('refuses shrinking once anyone has picked a slot, and saves nothing', async () => {
    seed();
    files.set('participants.json', JSON.stringify([makeParticipant({ availability: ['2026-01-02T10:00'] })]));

    await expect(updateEvent('abc123', KEY, range)).rejects.toThrow('CANNOT_SHRINK_RANGE_WITH_VOTES');
    expect(stored().dates).toEqual(['2026-01-01', '2026-01-02']);
  });
});
