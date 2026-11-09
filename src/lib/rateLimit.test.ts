import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configured: { value: false },
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return mocks.configured.value;
  },
  supabase: { rpc: mocks.rpc },
}));

import { rateLimit } from './rateLimit';

const LOOKUP_LIMIT = 30;

function request(ip: string): NextRequest {
  return new NextRequest('http://localhost/api/events', { headers: { 'x-forwarded-for': ip } });
}

describe('rateLimit', () => {
  beforeEach(() => {
    mocks.configured.value = false;
    mocks.rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('in memory', () => {
    it('allows up to the limit, then answers 429 with Retry-After', async () => {
      for (let i = 0; i < LOOKUP_LIMIT; i++) {
        await expect(rateLimit(request('10.0.0.1'), 'lookup')).resolves.toBeNull();
      }

      const blocked = await rateLimit(request('10.0.0.1'), 'lookup');
      expect(blocked?.status).toBe(429);
      expect(Number(blocked?.headers.get('Retry-After'))).toBeGreaterThan(0);
    });

    it('counts each IP and each bucket separately', async () => {
      for (let i = 0; i < LOOKUP_LIMIT + 1; i++) await rateLimit(request('10.0.0.2'), 'lookup');

      await expect(rateLimit(request('10.0.0.3'), 'lookup')).resolves.toBeNull();
      await expect(rateLimit(request('10.0.0.2'), 'read')).resolves.toBeNull();
    });

    it('allows requests again after the window', async () => {
      vi.useFakeTimers();
      for (let i = 0; i < LOOKUP_LIMIT + 1; i++) await rateLimit(request('10.0.0.4'), 'lookup');
      expect((await rateLimit(request('10.0.0.4'), 'lookup'))?.status).toBe(429);

      vi.advanceTimersByTime(61_000);

      await expect(rateLimit(request('10.0.0.4'), 'lookup')).resolves.toBeNull();
    });

    it('uses only the first address in x-forwarded-for', async () => {
      for (let i = 0; i < LOOKUP_LIMIT + 1; i++) {
        await rateLimit(request(`10.0.0.5, 172.16.0.${i}`), 'lookup');
      }
      expect((await rateLimit(request('10.0.0.5'), 'lookup'))?.status).toBe(429);
    });
  });

  describe('with Supabase', () => {
    beforeEach(() => {
      mocks.configured.value = true;
    });

    it('never sends the raw IP', async () => {
      mocks.rpc.mockResolvedValue({ data: 0, error: null });

      await rateLimit(request('203.0.113.77'), 'vote');

      const params = mocks.rpc.mock.calls[0][1];
      expect(mocks.rpc.mock.calls[0][0]).toBe('check_rate_limit');
      expect(params.p_key).toMatch(/^vote:[0-9a-f]{64}$/);
      expect(JSON.stringify(params)).not.toContain('203.0.113.77');
    });

    it('answers 429 with the wait the database returns', async () => {
      mocks.rpc.mockResolvedValue({ data: 42, error: null });

      const blocked = await rateLimit(request('203.0.113.1'), 'vote');

      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get('Retry-After')).toBe('42');
    });

    it.each([
      ['returns an error', () => mocks.rpc.mockResolvedValue({ data: null, error: { message: 'down' } })],
      ['throws', () => mocks.rpc.mockRejectedValue(new Error('down'))],
    ])('still limits in memory when the RPC %s', async (name, arrange) => {
      arrange();
      const ip = `203.0.113.${name === 'throws' ? 2 : 3}`;

      for (let i = 0; i < LOOKUP_LIMIT; i++) {
        await expect(rateLimit(request(ip), 'lookup')).resolves.toBeNull();
      }
      expect((await rateLimit(request(ip), 'lookup'))?.status).toBe(429);
    });
  });
});
