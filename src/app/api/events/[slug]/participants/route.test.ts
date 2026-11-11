import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeParticipant } from '@/test/fixtures';

// In memory, so these tests can never touch the real data/ folder.
const files = vi.hoisted(() => new Map<string, string>());
const cap = vi.hoisted(() => ({ value: 3_500_000 }));

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

vi.mock('@/lib/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  shouldUseSupabase: () => false,
}));

vi.mock('@/lib/rateLimit', () => ({ rateLimit: vi.fn(async () => null) }));

vi.mock('@/lib/validation', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/validation')>();
  return {
    ...actual,
    LIMITS: {
      ...actual.LIMITS,
      get maxEventPayloadBytes() {
        return cap.value;
      },
    },
  };
});

import { POST } from './route';
import { hashSecret } from '@/lib/validation';

const NOTE = 'x'.repeat(300);
const TOKEN = 'edit-token-a';

const A = makeParticipant({ id: 'a', name: 'Ann', note: NOTE, editToken: hashSecret(TOKEN) });
const B = makeParticipant({ id: 'b', name: 'Bob', note: NOTE, editToken: hashSecret('tok-b') });

const stored = (): { id: string; note: string }[] => JSON.parse(files.get('participants.json') ?? '[]');

function post(body: Record<string, unknown>) {
  const req = new NextRequest('http://localhost/api/events/abc123/participants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ slug: 'abc123' }) });
}

describe('POST /api/events/[slug]/participants payload cap', () => {
  beforeEach(() => {
    files.clear();
    cap.value = 3_500_000;
    files.set('events.json', JSON.stringify([makeEvent()]));
    files.set('participants.json', JSON.stringify([A, B]));
  });

  it('accepts a normal vote', async () => {
    const res = await post({ name: 'Cat', note: 'hi', availability: ['2026-12-01'] });
    expect(res.status).toBe(200);
    expect(stored()).toHaveLength(3);
  });

  it('returns 409 and saves nothing when a new vote would exceed the cap', async () => {
    cap.value = JSON.stringify([A, B]).length + 10;
    const before = files.get('participants.json');

    const res = await post({ name: 'Cat', note: NOTE, availability: ['2026-12-01'] });

    expect(res.status).toBe(409);
    expect(files.get('participants.json')).toBe(before);
  });

  it('lets an edit exactly at the cap through because its own old row is excluded', async () => {
    const edit = { id: 'a', editToken: TOKEN, name: 'Ann', note: NOTE, availability: ['2026-12-01'] };
    cap.value = JSON.stringify([B]).length + JSON.stringify(edit).length;

    const res = await post(edit);

    expect(res.status).toBe(200);
    expect(stored()).toHaveLength(2);
  });

  it('returns 409 for an edit one byte over the cap, and saves nothing', async () => {
    const edit = { id: 'a', editToken: TOKEN, name: 'Ann', note: NOTE, availability: ['2026-12-01'] };
    cap.value = JSON.stringify([B]).length + JSON.stringify(edit).length - 1;
    const before = files.get('participants.json');

    const res = await post(edit);

    expect(res.status).toBe(409);
    expect(files.get('participants.json')).toBe(before);
  });

  it('returns 409 for a new voter when the same cap is full', async () => {
    cap.value = JSON.stringify([A, B]).length;

    const res = await post({ name: 'Dan', note: '', availability: ['2026-12-01'] });

    expect(res.status).toBe(409);
    expect(stored()).toHaveLength(2);
  });
});
