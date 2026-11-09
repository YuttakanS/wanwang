import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent } from '@/test/fixtures';
import { hashSecret } from './validation';

interface Call {
  table: string;
  steps: { method: string; args: unknown[] }[];
}

/** Records every query. Each awaited query takes the next queued result, in order. */
const fake = vi.hoisted(() => {
  const state = {
    calls: [] as Call[],
    results: [] as { data?: unknown; error?: unknown }[],
  };
  const supabase = {
    from(table: string) {
      const call: Call = { table, steps: [] };
      state.calls.push(call);
      const builder: Record<string, unknown> = {};
      const chain = new Proxy(builder, {
        get(_target, prop: string) {
          if (prop === 'then') {
            const result = state.results.shift() ?? { data: null, error: null };
            return (resolve: (value: unknown) => void) => resolve(result);
          }
          return (...args: unknown[]) => {
            call.steps.push({ method: prop, args });
            return chain;
          };
        },
      });
      return chain;
    },
  };
  return { state, supabase };
});

vi.mock('./supabaseClient', () => ({
  supabase: fake.supabase,
  isSupabaseConfigured: true,
  shouldUseSupabase: () => true,
}));

import {
  createEvent,
  deleteEvent,
  deleteParticipant,
  getAdminEventSummaries,
  rotateAdminKey,
  updateEvent,
  upsertParticipant,
} from './db';

const { state } = fake;
const stepsNamed = (call: Call, method: string) => call.steps.filter(s => s.method === method);
const argsOf = (call: Call, method: string) => stepsNamed(call, method)[0]?.args[0] as Record<string, unknown>;
const hasEq = (call: Call, column: string, value: unknown) =>
  stepsNamed(call, 'eq').some(s => s.args[0] === column && s.args[1] === value);
const didWrite = () =>
  state.calls.some(c => c.steps.some(s => ['update', 'delete', 'insert'].includes(s.method)));

const CURRENT_KEY = 'current-admin-key';
const stored = { id: 'event-1', admin_key: hashSecret(CURRENT_KEY) };

beforeEach(() => {
  state.calls.length = 0;
  state.results.length = 0;
});

describe('createEvent', () => {
  it('stores only the hash of the admin key and returns the key once', async () => {
    state.results.push({
      data: { id: 'event-1', slug: 'abc123', title: 'Team dinner', is_closed: false },
      error: null,
    });

    const created = await createEvent(makeEvent({ adminKey: 'plain-key' }));

    const inserted = argsOf(state.calls[0], 'insert');
    expect(inserted.admin_key).toBe(hashSecret('plain-key'));
    expect(JSON.stringify(inserted)).not.toContain('plain-key');
    expect(created.adminKey).toBe('plain-key');
  });
});

describe('upsertParticipant', () => {
  it('stores only the hash of a new edit token', async () => {
    state.results.push({ data: { id: 'p1', name: 'Ann', availability: [] }, error: null });

    const saved = await upsertParticipant('event-1', { name: 'Ann', note: '', availability: [] });

    const inserted = argsOf(state.calls[0], 'insert');
    expect(saved.editToken).toMatch(/^[0-9a-f]{32}$/);
    expect(inserted.edit_token).toBe(hashSecret(saved.editToken!));
    expect(JSON.stringify(inserted)).not.toContain(saved.editToken!);
  });

  it('refuses an edit without a token before touching the database', async () => {
    await expect(
      upsertParticipant('event-1', { id: 'p1', name: 'Ann', note: '', availability: [] })
    ).rejects.toThrow('FORBIDDEN');
    expect(state.calls).toHaveLength(0);
  });

  it('matches an edit on id, event and hashed token', async () => {
    state.results.push({ data: { id: 'p1', name: 'Ann', availability: [] }, error: null });

    await upsertParticipant('event-1', { id: 'p1', editToken: 'token', name: 'Ann', note: '', availability: [] });

    const call = state.calls[0];
    expect(hasEq(call, 'id', 'p1')).toBe(true);
    expect(hasEq(call, 'event_id', 'event-1')).toBe(true);
    expect(hasEq(call, 'edit_token', hashSecret('token'))).toBe(true);
  });

  it('refuses when the token matches no row', async () => {
    state.results.push({ data: null, error: null });

    await expect(
      upsertParticipant('event-1', { id: 'p1', editToken: 'wrong', name: 'Ann', note: '', availability: [] })
    ).rejects.toThrow('FORBIDDEN');
  });
});

describe('deleteParticipant', () => {
  it('refuses without admin rights or a token, before touching the database', async () => {
    await expect(deleteParticipant('event-1', 'p1', { asAdmin: false })).resolves.toBe(false);
    expect(state.calls).toHaveLength(0);
  });

  it('limits a non-admin delete to the hashed token', async () => {
    state.results.push({ data: [{ id: 'p1' }], error: null });

    await expect(deleteParticipant('event-1', 'p1', { asAdmin: false, editToken: 'token' })).resolves.toBe(true);

    expect(hasEq(state.calls[0], 'edit_token', hashSecret('token'))).toBe(true);
    expect(hasEq(state.calls[0], 'event_id', 'event-1')).toBe(true);
  });

  it('does not need a token for an admin, but stays inside the event', async () => {
    state.results.push({ data: [{ id: 'p1' }], error: null });

    await expect(deleteParticipant('event-1', 'p1', { asAdmin: true })).resolves.toBe(true);

    expect(stepsNamed(state.calls[0], 'eq').some(s => s.args[0] === 'edit_token')).toBe(false);
    expect(hasEq(state.calls[0], 'event_id', 'event-1')).toBe(true);
  });

  it('reports failure when no row matched', async () => {
    state.results.push({ data: [], error: null });

    await expect(deleteParticipant('event-1', 'p1', { asAdmin: false, editToken: 'wrong' })).resolves.toBe(false);
  });
});

describe('updateEvent', () => {
  it('refuses a wrong key without writing', async () => {
    state.results.push({ data: { ...stored, granularity: 'day', dates: [] }, error: null });

    await expect(updateEvent('abc123', 'wrong-key', { title: 'Hacked' })).rejects.toThrow('UNAUTHORIZED');
    expect(didWrite()).toBe(false);
  });

  it('refuses an unknown event without writing', async () => {
    state.results.push({ data: null, error: null });

    await expect(updateEvent('nope', CURRENT_KEY, { title: 'Hacked' })).rejects.toThrow('UNAUTHORIZED');
    expect(didWrite()).toBe(false);
  });

  it('never writes the admin key, even if asked to', async () => {
    state.results.push({ data: { ...stored, granularity: 'day', dates: [] }, error: null });
    state.results.push({ data: { id: 'event-1', dates: [] }, error: null });

    await updateEvent('abc123', CURRENT_KEY, { title: 'New', adminKey: 'attacker-key' });

    const update = state.calls.find(c => stepsNamed(c, 'update').length > 0)!;
    const payload = argsOf(update, 'update');
    expect(payload.title).toBe('New');
    expect(payload).not.toHaveProperty('admin_key');
  });

  it('refuses a granularity change once people have voted', async () => {
    state.results.push({ data: { ...stored, granularity: 'day', dates: [] }, error: null });
    state.results.push({ data: [{ id: 'p1', event_id: 'event-1', availability: [] }], error: null });

    await expect(updateEvent('abc123', CURRENT_KEY, { granularity: 'hour' }))
      .rejects.toThrow('CANNOT_CHANGE_GRANULARITY_WITH_VOTES');
    expect(didWrite()).toBe(false);
  });

  it('refuses shrinking the range once people have voted', async () => {
    state.results.push({ data: { ...stored, granularity: 'day', dates: ['2026-12-01', '2026-12-05'] }, error: null });
    state.results.push({ data: [{ id: 'p1', event_id: 'event-1', availability: [] }], error: null });

    await expect(updateEvent('abc123', CURRENT_KEY, { dateRangeStart: '2026-12-02', dateRangeEnd: '2026-12-05' }))
      .rejects.toThrow('CANNOT_SHRINK_RANGE_WITH_VOTES');
    expect(didWrite()).toBe(false);
  });
});

describe('rotateAdminKey', () => {
  it('refuses a wrong key without writing', async () => {
    state.results.push({ data: stored, error: null });

    await expect(rotateAdminKey('abc123', 'wrong-key')).resolves.toBeNull();
    expect(didWrite()).toBe(false);
  });

  it('stores the hash of the new key and guards against a simultaneous rotation', async () => {
    state.results.push({ data: stored, error: null });
    state.results.push({ data: { id: 'event-1' }, error: null });

    const newKey = await rotateAdminKey('abc123', CURRENT_KEY);

    const update = state.calls[1];
    expect(newKey).toMatch(/^[0-9a-f]{32}$/);
    expect(newKey).not.toBe(CURRENT_KEY);
    expect(argsOf(update, 'update').admin_key).toBe(hashSecret(newKey!));
    expect(hasEq(update, 'admin_key', stored.admin_key)).toBe(true);
  });

  it('returns null when another rotation won', async () => {
    state.results.push({ data: stored, error: null });
    state.results.push({ data: null, error: null });

    await expect(rotateAdminKey('abc123', CURRENT_KEY)).resolves.toBeNull();
  });
});

describe('deleteEvent', () => {
  it('refuses a wrong key without deleting', async () => {
    state.results.push({ data: stored, error: null });

    await expect(deleteEvent('abc123', 'wrong-key')).resolves.toBe(false);
    expect(didWrite()).toBe(false);
  });

  it('deletes with the right key', async () => {
    state.results.push({ data: stored, error: null });
    state.results.push({ error: null });

    await expect(deleteEvent('abc123', CURRENT_KEY)).resolves.toBe(true);
    expect(hasEq(state.calls[1], 'id', 'event-1')).toBe(true);
  });
});

describe('getAdminEventSummaries', () => {
  it('returns only events whose key matches, without the hash', async () => {
    state.results.push({
      data: [
        { slug: 'mine', title: 'Mine', is_closed: false, created_at: 'x', admin_key: hashSecret('my-key'), participants: [{ count: 2 }] },
        { slug: 'other', title: 'Other', is_closed: false, created_at: 'x', admin_key: hashSecret('their-key'), participants: [{ count: 9 }] },
      ],
      error: null,
    });

    const summaries = await getAdminEventSummaries([
      { slug: 'mine', adminKey: 'my-key' },
      { slug: 'other', adminKey: 'guess' },
    ]);

    expect(summaries.map(s => s.slug)).toEqual(['mine']);
    expect(summaries[0].participantCount).toBe(2);
    expect(JSON.stringify(summaries)).not.toContain(hashSecret('my-key'));
  });
});
