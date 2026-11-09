import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLocalizedDate, generateAllEventSlots } from '@/lib/timeUtils';
import type { WanWangEvent } from '@/types';

async function loadApiUrl() {
  vi.resetModules();
  return (await import('./config')).apiUrl;
}

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses production by default', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    expect(await loadApiUrl()).toBe('https://wanwang-one.vercel.app');
  });

  it('accepts an override without a trailing slash', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://192.168.1.101:3000/');
    expect(await loadApiUrl()).toBe('http://192.168.1.101:3000');
  });
});

// If this breaks, the app and the website no longer agree on what a slot id is.
describe('code shared with the website', () => {
  it('produces the slot ids the API expects', () => {
    const base = { dates: ['2026-12-31'], startTime: '09:00', endTime: '10:00', slotInterval: 60 };
    const ids = (granularity: WanWangEvent['granularity']) =>
      generateAllEventSlots({ ...base, granularity } as WanWangEvent).map(s => s.id);

    expect(ids('day')).toEqual(['2026-12-31']);
    expect(ids('daypart')[0]).toBe('2026-12-31Tmorning');
    expect(ids('hour')).toEqual(['2026-12-31T09:00']);
  });

  it('formats dates', () => {
    expect(formatLocalizedDate('2026-12-31', 'en', 'chip')).toContain('31');
  });
});
