import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent } from '@/test/fixtures';
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
