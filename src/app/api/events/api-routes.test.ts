import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeParticipant } from '@/test/fixtures';
import { ValidationError, hashSecret } from '@/lib/validation';
import { MAX_ADMIN_LOOKUP } from '@/types';

const db = vi.hoisted(() => ({
  createEvent: vi.fn(),
  getEventBySlug: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getParticipantsByEventId: vi.fn(),
  upsertParticipant: vi.fn(),
  deleteParticipant: vi.fn(),
  rotateAdminKey: vi.fn(),
  getAdminEventSummaries: vi.fn(),
}));
const limiter = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock('@/lib/db', () => db);
vi.mock('@/lib/rateLimit', () => limiter);

import { POST as createEventRoute } from './route';
import { GET, PATCH, DELETE } from './[slug]/route';
import { POST as saveParticipant, DELETE as removeParticipant } from './[slug]/participants/route';
import { POST as rotateKey } from './[slug]/admin-key/route';
import { POST as lookup } from './lookup/route';

const SLUG = 'abc123';
const params = { params: Promise.resolve({ slug: SLUG }) };
const ADMIN_KEY = 'right-admin-key';
const ADMIN_HASH = hashSecret(ADMIN_KEY);
const TOKEN = 'my-edit-token';
const TOKEN_HASH = hashSecret(TOKEN);

function request(
  method: string,
  path: string,
  { headers, body }: { headers?: Record<string, string>; body?: unknown } = {}
) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const eventPath = `/api/events/${SLUG}`;
const asAdmin = { 'x-admin-key': ADMIN_KEY };

beforeEach(() => {
  vi.resetAllMocks();
  limiter.rateLimit.mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('rate limiting', () => {
  it.each([
    ['create event', () => createEventRoute(request('POST', '/api/events', { body: {} }))],
    ['read event', () => GET(request('GET', eventPath), params)],
    ['edit event', () => PATCH(request('PATCH', eventPath, { headers: asAdmin, body: {} }), params)],
    ['delete event', () => DELETE(request('DELETE', eventPath, { headers: asAdmin }), params)],
    ['vote', () => saveParticipant(request('POST', `${eventPath}/participants`, { body: {} }), params)],
    ['delete vote', () => removeParticipant(request('DELETE', `${eventPath}/participants?id=p1`), params)],
    ['rotate key', () => rotateKey(request('POST', `${eventPath}/admin-key`, { headers: asAdmin }), params)],
    ['lookup', () => lookup(request('POST', '/api/events/lookup', { body: { items: [] } }))],
  ])('%s stops before touching the database', async (_name, call) => {
    limiter.rateLimit.mockResolvedValue(NextResponse.json({ error: 'slow down' }, { status: 429 }));

    const res = await call();

    expect(res.status).toBe(429);
    for (const fn of Object.values(db)) expect(fn).not.toHaveBeenCalled();
  });

  it('counts a page reloading itself apart from page loads', async () => {
    await GET(request('GET', eventPath), params);
    await GET(request('GET', eventPath, { headers: { 'x-wanwang-refresh': '1' } }), params);

    expect(limiter.rateLimit.mock.calls.map(call => call[1])).toEqual(['read', 'refresh']);
  });
});

describe('POST /api/events', () => {
  const body = { title: 'Team dinner', dateRangeStart: '2026-12-01', dateRangeEnd: '2026-12-03' };

  it('ignores a slug or admin key chosen by the client', async () => {
    db.createEvent.mockImplementation(async p => makeEvent(p));

    const res = await createEventRoute(
      request('POST', '/api/events', { body: { ...body, slug: 'chosen', adminKey: 'chosen', isClosed: true } })
    );

    const data = await res.json();
    expect(res.status).toBe(200);
    const params = db.createEvent.mock.calls[0][0];
    expect(params.slug).not.toBe('chosen');
    expect(params.adminKey).not.toBe('chosen');
    expect(params.isClosed).toBe(false);
    expect(data.adminKey).toBe(params.adminKey);
  });

  it('answers 400 for invalid input, bad JSON and 413 for a huge body', async () => {
    const invalid = await createEventRoute(request('POST', '/api/events', { body: { title: '' } }));
    const badJson = await createEventRoute(request('POST', '/api/events', { body: '{nope' }));
    const huge = await createEventRoute(request('POST', '/api/events', { body: 'x'.repeat(40_001) }));

    expect([invalid.status, badJson.status, huge.status]).toEqual([400, 400, 413]);
    expect(db.createEvent).not.toHaveBeenCalled();
  });

  it('hides internal error details', async () => {
    db.createEvent.mockRejectedValue(new Error('connection string with password'));

    const res = await createEventRoute(request('POST', '/api/events', { body }));

    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('password');
  });
});

describe('GET /api/events/[slug]', () => {
  beforeEach(() => {
    db.getEventBySlug.mockResolvedValue(makeEvent({ adminKey: ADMIN_HASH }));
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({ id: 'mine', name: 'Me', editToken: TOKEN_HASH }),
      makeParticipant({ id: 'theirs', name: 'Them', editToken: hashSecret('their-token') }),
    ]);
  });

  it('answers 404 for an unknown event', async () => {
    db.getEventBySlug.mockResolvedValue(null);
    expect((await GET(request('GET', eventPath), params)).status).toBe(404);
  });

  it('never exposes the admin hash or any edit token', async () => {
    const res = await GET(request('GET', eventPath, { headers: { ...asAdmin, 'x-edit-token': TOKEN } }), params);
    const text = await res.text();

    expect(text).not.toContain(ADMIN_HASH);
    expect(text).not.toContain(TOKEN_HASH);
    expect(text).not.toContain(hashSecret('their-token'));
    expect(text).not.toContain('editToken');
  });

  it('gives a visitor no admin rights or key', async () => {
    const data = await (await GET(request('GET', eventPath), params)).json();

    expect(data.isAdmin).toBe(false);
    expect(data.event).not.toHaveProperty('adminKey');
  });

  it('gives a wrong key no admin rights', async () => {
    const res = await GET(request('GET', eventPath, { headers: { 'x-admin-key': 'wrong' } }), params);
    const data = await res.json();

    expect(data.isAdmin).toBe(false);
    expect(data.event).not.toHaveProperty('adminKey');
  });

  it('does not accept the stored hash as an admin key', async () => {
    const res = await GET(request('GET', eventPath, { headers: { 'x-admin-key': ADMIN_HASH } }), params);
    expect((await res.json()).isAdmin).toBe(false);
  });

  it('recognises the right key and echoes only what the caller proved', async () => {
    const data = await (await GET(request('GET', eventPath, { headers: asAdmin }), params)).json();

    expect(data.isAdmin).toBe(true);
    expect(data.event.adminKey).toBe(ADMIN_KEY);
  });

  it('marks only the participant whose token matches', async () => {
    const res = await GET(request('GET', eventPath, { headers: { 'x-edit-token': TOKEN } }), params);
    const { participants } = await res.json();

    expect(participants.map((p: { id: string; isMine: boolean }) => [p.id, p.isMine])).toEqual([
      ['mine', true],
      ['theirs', false],
    ]);
  });
});

describe('PATCH /api/events/[slug]', () => {
  it('answers 401 without a key', async () => {
    const res = await PATCH(request('PATCH', eventPath, { body: { title: 'x' } }), params);
    expect(res.status).toBe(401);
    expect(db.updateEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['UNAUTHORIZED', 403],
    ['CANNOT_CHANGE_GRANULARITY_WITH_VOTES', 400],
    ['CANNOT_SHRINK_RANGE_WITH_VOTES', 400],
    ['some database failure', 500],
  ])('maps the error %s to %i', async (message, status) => {
    db.updateEvent.mockRejectedValue(new Error(message));

    const res = await PATCH(request('PATCH', eventPath, { headers: asAdmin, body: { title: 'x' } }), params);

    expect(res.status).toBe(status);
    if (status === 500) expect(await res.text()).not.toContain('database failure');
  });

  it('answers 400 and explains when an edit would exceed the slot cap', async () => {
    db.updateEvent.mockRejectedValue(new ValidationError('Too many time slots (max 10000)'));

    const res = await PATCH(request('PATCH', eventPath, { headers: asAdmin, body: { granularity: 'hour' } }), params);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Too many time slots');
  });

  it('answers 403 when nothing was updated', async () => {
    db.updateEvent.mockResolvedValue(null);
    const res = await PATCH(request('PATCH', eventPath, { headers: asAdmin, body: { title: 'x' } }), params);
    expect(res.status).toBe(403);
  });

  it('passes on only the allowed fields', async () => {
    db.updateEvent.mockResolvedValue(makeEvent());

    await PATCH(
      request('PATCH', eventPath, { headers: asAdmin, body: { title: 'New', adminKey: 'attacker', id: 'other' } }),
      params
    );

    expect(db.updateEvent).toHaveBeenCalledWith(SLUG, ADMIN_KEY, { title: 'New' });
  });

  it('answers 400 for invalid input and 413 for a huge body', async () => {
    const invalid = await PATCH(request('PATCH', eventPath, { headers: asAdmin, body: { title: ' ' } }), params);
    const huge = await PATCH(request('PATCH', eventPath, { headers: asAdmin, body: 'x'.repeat(40_001) }), params);

    expect([invalid.status, huge.status]).toEqual([400, 413]);
    expect(db.updateEvent).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/events/[slug]', () => {
  it('answers 401 without a key', async () => {
    expect((await DELETE(request('DELETE', eventPath), params)).status).toBe(401);
    expect(db.deleteEvent).not.toHaveBeenCalled();
  });

  it('answers 403 for a wrong key', async () => {
    db.deleteEvent.mockResolvedValue(false);
    expect((await DELETE(request('DELETE', eventPath, { headers: asAdmin }), params)).status).toBe(403);
  });

  it('succeeds with the right key', async () => {
    db.deleteEvent.mockResolvedValue(true);
    expect((await DELETE(request('DELETE', eventPath, { headers: asAdmin }), params)).status).toBe(200);
    expect(db.deleteEvent).toHaveBeenCalledWith(SLUG, ADMIN_KEY);
  });
});

describe('POST /api/events/[slug]/admin-key', () => {
  const path = `${eventPath}/admin-key`;

  it('answers 401 without a key and 403 for a wrong one', async () => {
    expect((await rotateKey(request('POST', path), params)).status).toBe(401);
    db.rotateAdminKey.mockResolvedValue(null);
    expect((await rotateKey(request('POST', path, { headers: asAdmin }), params)).status).toBe(403);
  });

  it('returns the new key', async () => {
    db.rotateAdminKey.mockResolvedValue('new-key');
    const res = await rotateKey(request('POST', path, { headers: asAdmin }), params);
    expect((await res.json()).adminKey).toBe('new-key');
    // No body: the server picks the key, as apps released before proposals still ask.
    expect(db.rotateAdminKey).toHaveBeenCalledWith(SLUG, ADMIN_KEY, undefined);
  });

  it('passes on a key the client proposes', async () => {
    const newKey = '0123456789abcdef0123456789abcdef';
    db.rotateAdminKey.mockResolvedValue(newKey);
    const res = await rotateKey(request('POST', path, { headers: asAdmin, body: { newKey } }), params);
    expect(res.status).toBe(200);
    expect(db.rotateAdminKey).toHaveBeenCalledWith(SLUG, ADMIN_KEY, newKey);
  });

  it.each([
    ['too short', { newKey: 'abc' }],
    ['not hex', { newKey: 'z'.repeat(32) }],
    ['uppercase', { newKey: 'A'.repeat(32) }],
    ['not a string', { newKey: 12345 }],
    ['not an object', '[]'],
    ['not JSON', '{'],
  ])('answers 400 to a proposed key that is %s, without touching the event', async (_name, body) => {
    db.rotateAdminKey.mockClear();
    const res = await rotateKey(request('POST', path, { headers: asAdmin, body }), params);
    expect(res.status).toBe(400);
    expect(db.rotateAdminKey).not.toHaveBeenCalled();
  });
});

describe('POST /api/events/[slug]/participants', () => {
  const path = `${eventPath}/participants`;

  beforeEach(() => {
    db.getEventBySlug.mockResolvedValue(makeEvent());
    db.getParticipantsByEventId.mockResolvedValue([]);
  });

  it('answers 404 for an unknown event', async () => {
    db.getEventBySlug.mockResolvedValue(null);
    expect((await saveParticipant(request('POST', path, { body: { name: 'Ann' } }), params)).status).toBe(404);
  });

  it('refuses votes on a closed event', async () => {
    db.getEventBySlug.mockResolvedValue(makeEvent({ isClosed: true }));

    const res = await saveParticipant(request('POST', path, { body: { name: 'Ann' } }), params);

    expect(res.status).toBe(400);
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });

  it('answers 403 when the edit token is wrong', async () => {
    db.upsertParticipant.mockRejectedValue(new Error('FORBIDDEN'));

    const res = await saveParticipant(
      request('POST', path, { body: { id: 'p1', editToken: 'wrong', name: 'Ann', availability: ['2026-12-01'] } }),
      params
    );

    expect(res.status).toBe(403);
  });

  it('answers 400 for invalid input, bad JSON and 413 for a huge body', async () => {
    const invalid = await saveParticipant(request('POST', path, { body: { name: '' } }), params);
    const badJson = await saveParticipant(request('POST', path, { body: '{nope' }), params);
    const huge = await saveParticipant(request('POST', path, { body: 'x'.repeat(200_001) }), params);

    expect([invalid.status, badJson.status, huge.status]).toEqual([400, 400, 413]);
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });

  it('saves the picked slots, without duplicates', async () => {
    db.upsertParticipant.mockResolvedValue(makeParticipant());

    const res = await saveParticipant(
      request('POST', path, { body: { name: 'Ann', availability: ['2026-12-01', '2026-12-03', '2026-12-01'] } }),
      params
    );

    expect(res.status).toBe(200);
    expect(db.upsertParticipant.mock.calls[0][1].availability).toEqual(['2026-12-01', '2026-12-03']);
  });

  it.each([
    ['no availability', { name: 'Ann' }],
    ['an empty list', { name: 'Ann', availability: [] }],
    ['a string', { name: 'Ann', availability: 'x' }],
    ['a slot outside the event', { name: 'Ann', availability: ['2026-12-01', '2030-01-01'] }],
    ['an edit that empties the answer', { id: 'p1', editToken: TOKEN, name: 'Ann', availability: [] }],
    ['an edit with a foreign slot', { id: 'p1', editToken: TOKEN, name: 'Ann', availability: ['2030-01-01'] }],
  ])('answers 400 and saves nothing for %s', async (_name, body) => {
    const res = await saveParticipant(request('POST', path, { body }), params);

    expect(res.status).toBe(400);
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/events/[slug]/participants', () => {
  const path = `${eventPath}/participants?id=p1`;

  beforeEach(() => {
    db.getEventBySlug.mockResolvedValue(makeEvent({ adminKey: ADMIN_HASH }));
  });

  it('answers 400 without an id', async () => {
    const res = await removeParticipant(request('DELETE', `${eventPath}/participants`), params);
    expect(res.status).toBe(400);
  });

  it.each([
    ['the right admin key', asAdmin, { asAdmin: true, editToken: undefined }],
    ['a wrong admin key', { 'x-admin-key': 'wrong' }, { asAdmin: false, editToken: undefined }],
    ['the stored hash', { 'x-admin-key': ADMIN_HASH }, { asAdmin: false, editToken: undefined }],
    ['an edit token', { 'x-edit-token': TOKEN }, { asAdmin: false, editToken: TOKEN }],
  ])('with %s, grants only the rights it proves', async (_name, headers, auth) => {
    db.deleteParticipant.mockResolvedValue(true);

    await removeParticipant(request('DELETE', path, { headers }), params);

    expect(db.deleteParticipant).toHaveBeenCalledWith('event-1', 'p1', auth);
  });

  it('answers 403 when nothing was deleted', async () => {
    db.deleteParticipant.mockResolvedValue(false);
    expect((await removeParticipant(request('DELETE', path), params)).status).toBe(403);
  });
});

describe('POST /api/events/lookup', () => {
  const path = '/api/events/lookup';

  it.each([
    ['items that are not a list', { items: 'nope' }],
    ['too many items', { items: Array.from({ length: MAX_ADMIN_LOOKUP + 1 }, () => ({ slug: 'a', adminKey: 'b' })) }],
    ['an item without a key', { items: [{ slug: 'a' }] }],
    ['a key that is not text', { items: [{ slug: 'a', adminKey: 1 }] }],
    ['an overlong slug', { items: [{ slug: 'x'.repeat(101), adminKey: 'b' }] }],
    ['an empty item', { items: [null] }],
  ])('rejects %s', async (_name, body) => {
    expect((await lookup(request('POST', path, { body }))).status).toBe(400);
    expect(db.getAdminEventSummaries).not.toHaveBeenCalled();
  });

  it('returns the summaries', async () => {
    db.getAdminEventSummaries.mockResolvedValue([{ slug: 'a' }]);

    const res = await lookup(request('POST', path, { body: { items: [{ slug: 'a', adminKey: 'b' }] } }));

    expect((await res.json()).events).toEqual([{ slug: 'a' }]);
  });
});
