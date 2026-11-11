import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeParticipant } from '@/test/fixtures';
import { hashSecret } from '@/lib/validation';
import { QUESTION_LIMITS } from '@/types';
import type { EventQuestion } from '@/types';

const db = vi.hoisted(() => ({
  getEventBySlug: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getParticipantsByEventId: vi.fn(),
  upsertParticipant: vi.fn(),
  deleteParticipant: vi.fn(),
}));
const store = vi.hoisted(() => {
  class FileStoreUnavailable extends Error {}
  return {
    FileStoreUnavailable,
    EVENT_FILE_QUOTA: { files: 3, bytes: 1000 },
    createUpload: vi.fn(),
    createDownloadUrl: vi.fn(),
    eventFileUsage: vi.fn(),
    storedFileSize: vi.fn(),
    removeFiles: vi.fn(),
    removeEventFiles: vi.fn(),
    sweepOrphanFiles: vi.fn(),
    // The real one: it only reads the answers it is given.
    filePathsIn: (answers: Record<string, unknown> | undefined) =>
      Object.values(answers ?? {})
        .filter((a): a is { path: string } => typeof a === 'object' && a !== null && 'path' in a)
        .map(a => a.path),
  };
});

vi.mock('@/lib/db', () => db);
vi.mock('@/lib/fileStore', () => store);
vi.mock('@/lib/rateLimit', () => ({ rateLimit: vi.fn(async () => null) }));

import { GET, DELETE as deleteEventRoute } from './[slug]/route';
import { POST as save, DELETE as removeParticipant } from './[slug]/participants/route';
import { POST as startUpload, GET as download } from './[slug]/files/route';
import { GET as sweep } from '../cron/sweep-files/route';

const SLUG = 'abc123';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_EVENT_ID = '22222222-2222-4222-8222-222222222222';
const FILE = `${EVENT_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.stl`;
const OLD_FILE = `${EVENT_ID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.stl`;
const ADMIN_KEY = 'right-admin-key';
const TOKEN = 'my-edit-token';
const params = { params: Promise.resolve({ slug: SLUG }) };
const eventPath = `/api/events/${SLUG}`;

const QUESTIONS: EventQuestion[] = [
  { id: 'colour01', type: 'choice', label: 'Filament', required: true, options: ['PLA', 'PETG'] },
  { id: 'model001', type: 'file', label: 'Model', required: false },
];

const event = (overrides = {}) =>
  makeEvent({ id: EVENT_ID, adminKey: hashSecret(ADMIN_KEY), questions: QUESTIONS, ...overrides });

function request(
  method: string,
  path: string,
  { headers, body }: { headers?: Record<string, string>; body?: unknown } = {}
) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const vote = (body: Record<string, unknown>) =>
  save(request('POST', `${eventPath}/participants`, { body: { name: 'Ann', answers: { colour01: 'PLA' }, ...body } }), params);

beforeEach(() => {
  vi.resetAllMocks();
  db.getEventBySlug.mockResolvedValue(event());
  db.getParticipantsByEventId.mockResolvedValue([]);
  db.upsertParticipant.mockImplementation(async (_id, input) => ({ ...makeParticipant(), ...input }));
  store.eventFileUsage.mockResolvedValue({ files: 0, bytes: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('who sees answers', () => {
  beforeEach(() => {
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({ id: 'mine', editToken: hashSecret(TOKEN), answers: { colour01: 'PLA' } }),
      makeParticipant({ id: 'theirs', editToken: hashSecret('other'), answers: { colour01: 'PETG' } }),
    ]);
  });

  const answersSeenWith = async (headers: Record<string, string>) => {
    const { participants } = await (await GET(request('GET', eventPath, { headers }), params)).json();
    return participants.map((p: { id: string; answers?: unknown }) => [p.id, p.answers]);
  };

  it('gives a visitor nobody’s answers', async () => {
    expect(await answersSeenWith({})).toEqual([['mine', undefined], ['theirs', undefined]]);
  });

  it('gives a respondent only their own', async () => {
    expect(await answersSeenWith({ 'x-edit-token': TOKEN })).toEqual([
      ['mine', { colour01: 'PLA' }],
      ['theirs', undefined],
    ]);
  });

  it('gives the creator everyone’s', async () => {
    expect(await answersSeenWith({ 'x-admin-key': ADMIN_KEY })).toEqual([
      ['mine', { colour01: 'PLA' }],
      ['theirs', { colour01: 'PETG' }],
    ]);
  });
});

describe('answering questions', () => {
  it('saves valid answers and drops answers to questions the event does not have', async () => {
    const res = await vote({ availability: ['2026-12-01'], answers: { colour01: 'PETG', made_up: 'x' } });

    expect(res.status).toBe(200);
    expect(db.upsertParticipant.mock.calls[0][1].answers).toEqual({ colour01: 'PETG' });
  });

  it.each([
    ['a required question left out', {}],
    ['an option that is not offered', { colour01: 'Nylon' }],
    ['a file from another event', { colour01: 'PLA', model001: { path: FILE.replace(EVENT_ID, OTHER_EVENT_ID), name: 'a.stl' } }],
  ])('rejects %s', async (_name, answers) => {
    const res = await vote({ availability: ['2026-12-01'], answers });

    expect(res.status).toBe(400);
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });
});

describe('per-slot limit', () => {
  const full = [
    makeParticipant({ id: 'p1', availability: ['2026-12-01'] }),
    makeParticipant({ id: 'p2', editToken: hashSecret(TOKEN), availability: ['2026-12-01', '2026-12-02'] }),
  ];

  beforeEach(() => {
    db.getEventBySlug.mockResolvedValue(event({ maxPerSlot: 2 }));
    db.getParticipantsByEventId.mockResolvedValue(full);
  });

  it('refuses a new person in a full slot and says which slot', async () => {
    const res = await vote({ availability: ['2026-12-01', '2026-12-03'] });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'SLOT_FULL', fullSlots: ['2026-12-01'] });
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });

  it('takes a new person in a slot with room', async () => {
    expect((await vote({ availability: ['2026-12-02'] })).status).toBe(200);
  });

  it('lets someone already in a full slot edit their answer', async () => {
    const res = await vote({ id: 'p2', editToken: TOKEN, availability: ['2026-12-01', '2026-12-03'] });

    expect(res.status).toBe(200);
  });

  it('answers 409 when the database finds the slot filled by a save that arrived at the same time', async () => {
    db.upsertParticipant.mockRejectedValue(new Error('SLOT_FULL'));

    const res = await vote({ availability: ['2026-12-03'] });

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('SLOT_FULL');
  });
});

describe('per-person limit', () => {
  it('refuses more slots than the event allows', async () => {
    db.getEventBySlug.mockResolvedValue(event({ maxPicks: 1 }));

    expect((await vote({ availability: ['2026-12-01', '2026-12-02'] })).status).toBe(400);
    expect((await vote({ availability: ['2026-12-01'] })).status).toBe(200);
  });
});

describe('attached files on save', () => {
  const withFile = (path: string) => ({ colour01: 'PLA', model001: { path, name: 'part.stl', size: 1 } });

  it('refuses a file that was never uploaded', async () => {
    store.storedFileSize.mockResolvedValue(null);

    const res = await vote({ availability: ['2026-12-01'], answers: withFile(FILE) });

    expect(res.status).toBe(400);
    expect(db.upsertParticipant).not.toHaveBeenCalled();
  });

  it('records the size storage reports, not the one the client sent', async () => {
    store.storedFileSize.mockResolvedValue(4096);

    await vote({ availability: ['2026-12-01'], answers: withFile(FILE) });

    expect(db.upsertParticipant.mock.calls[0][1].answers.model001).toEqual({ path: FILE, name: 'part.stl', size: 4096 });
  });

  it('deletes the file an edit replaced, and does not re-check a file that was kept', async () => {
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({ id: 'p1', editToken: hashSecret(TOKEN), answers: withFile(OLD_FILE) }),
    ]);
    store.storedFileSize.mockResolvedValue(10);

    await vote({ id: 'p1', editToken: TOKEN, availability: ['2026-12-01'], answers: withFile(FILE) });
    expect(store.removeFiles).toHaveBeenLastCalledWith([OLD_FILE]);

    store.storedFileSize.mockClear();
    await vote({ id: 'p1', editToken: TOKEN, availability: ['2026-12-01'], answers: withFile(OLD_FILE) });
    expect(store.storedFileSize).not.toHaveBeenCalled();
    expect(store.removeFiles).toHaveBeenLastCalledWith([]);
  });

  it('keeps the old file when the edit is refused', async () => {
    db.getParticipantsByEventId.mockResolvedValue([makeParticipant({ id: 'p1', answers: withFile(OLD_FILE) })]);
    db.upsertParticipant.mockRejectedValue(new Error('FORBIDDEN'));

    const res = await vote({ id: 'p1', editToken: 'wrong', availability: ['2026-12-01'] });

    expect(res.status).toBe(403);
    expect(store.removeFiles).not.toHaveBeenCalled();
  });
});

describe('deleting', () => {
  it('removes a deleted person’s files', async () => {
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({ id: 'p1', answers: { model001: { path: FILE, name: 'a.stl', size: 1 } } }),
    ]);
    db.deleteParticipant.mockResolvedValue(true);

    await removeParticipant(
      request('DELETE', `${eventPath}/participants?id=p1`, { headers: { 'x-admin-key': ADMIN_KEY } }),
      params
    );

    expect(store.removeFiles).toHaveBeenCalledWith([FILE]);
  });

  it('keeps the files when the delete is refused', async () => {
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({ id: 'p1', answers: { model001: { path: FILE, name: 'a.stl', size: 1 } } }),
    ]);
    db.deleteParticipant.mockResolvedValue(false);

    await removeParticipant(request('DELETE', `${eventPath}/participants?id=p1`), params);

    expect(store.removeFiles).not.toHaveBeenCalled();
  });

  it('removes all of a deleted event’s files, but only once the event is really deleted', async () => {
    db.deleteEvent.mockResolvedValue(false);
    await deleteEventRoute(request('DELETE', eventPath, { headers: { 'x-admin-key': 'wrong' } }), params);
    expect(store.removeEventFiles).not.toHaveBeenCalled();

    db.deleteEvent.mockResolvedValue(true);
    await deleteEventRoute(request('DELETE', eventPath, { headers: { 'x-admin-key': ADMIN_KEY } }), params);
    expect(store.removeEventFiles).toHaveBeenCalledWith(EVENT_ID);
  });
});

describe('POST /api/events/[slug]/files', () => {
  const start = (body: Record<string, unknown>) => startUpload(request('POST', `${eventPath}/files`, { body }), params);
  const ok = { questionId: 'model001', name: 'part.stl', size: 500 };

  it('hands out an upload URL for a file question', async () => {
    store.createUpload.mockResolvedValue({ path: FILE, uploadUrl: 'https://storage.example/upload' });

    const res = await start(ok);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ path: FILE, uploadUrl: 'https://storage.example/upload' });
    expect(store.createUpload).toHaveBeenCalledWith(EVENT_ID, 'part.stl');
  });

  it.each([
    ['a question that is not a file question', { ...ok, questionId: 'colour01' }, 400],
    ['an unknown question', { ...ok, questionId: 'nope' }, 400],
    ['a missing name', { ...ok, name: ' ' }, 400],
    ['a size that is not a number', { ...ok, size: '500' }, 400],
    ['a file over the size limit', { ...ok, size: QUESTION_LIMITS.fileBytes + 1 }, 413],
  ])('refuses %s', async (_name, body, status) => {
    expect((await start(body)).status).toBe(status);
    expect(store.createUpload).not.toHaveBeenCalled();
  });

  it('refuses once the event’s storage allowance is used up', async () => {
    store.eventFileUsage.mockResolvedValue({ files: 1, bytes: 600 });
    expect((await start(ok)).status).toBe(409);

    store.eventFileUsage.mockResolvedValue({ files: 3, bytes: 0 });
    expect((await start(ok)).status).toBe(409);
    expect(store.createUpload).not.toHaveBeenCalled();
  });

  it('refuses uploads to a closed event', async () => {
    db.getEventBySlug.mockResolvedValue(event({ isClosed: true }));
    expect((await start(ok)).status).toBe(400);
  });

  it('answers 503 where there is no file storage', async () => {
    store.eventFileUsage.mockRejectedValue(new store.FileStoreUnavailable());
    expect((await start(ok)).status).toBe(503);
  });
});

describe('GET /api/events/[slug]/files', () => {
  const get = (path: string, headers: Record<string, string> = {}) =>
    download(request('GET', `${eventPath}/files?path=${encodeURIComponent(path)}`, { headers }), params);

  beforeEach(() => {
    db.getParticipantsByEventId.mockResolvedValue([
      makeParticipant({
        id: 'p1',
        editToken: hashSecret(TOKEN),
        answers: { model001: { path: FILE, name: 'part.stl', size: 1 } },
      }),
    ]);
    store.createDownloadUrl.mockResolvedValue('https://storage.example/signed');
  });

  it('gives the creator a link that downloads under the original name', async () => {
    const res = await get(FILE, { 'x-admin-key': ADMIN_KEY });

    expect(await res.json()).toMatchObject({ url: 'https://storage.example/signed' });
    expect(store.createDownloadUrl).toHaveBeenCalledWith(FILE, 'part.stl');
  });

  it('gives the person who attached it a link too', async () => {
    expect((await get(FILE, { 'x-edit-token': TOKEN })).status).toBe(200);
  });

  it.each([
    ['a visitor', {}],
    ['another respondent', { 'x-edit-token': 'someone-else' }],
  ])('answers 404 to %s', async (_name, headers) => {
    expect((await get(FILE, headers)).status).toBe(404);
    expect(store.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('answers 404 to the creator for a file no answer points at', async () => {
    expect((await get(OLD_FILE, { 'x-admin-key': ADMIN_KEY })).status).toBe(404);
  });

  it('refuses a path outside this event', async () => {
    const res = await get(FILE.replace(EVENT_ID, OTHER_EVENT_ID), { 'x-admin-key': ADMIN_KEY });

    expect(res.status).toBe(400);
    expect(store.createDownloadUrl).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/sweep-files', () => {
  const run = (authorization?: string) =>
    sweep(request('GET', '/api/cron/sweep-files', { headers: authorization ? { authorization } : {} }));

  afterEach(() => vi.unstubAllEnvs());

  it('runs for nobody when no secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect((await run('Bearer ')).status).toBe(401);
    expect(store.sweepOrphanFiles).not.toHaveBeenCalled();
  });

  it('runs only with the right secret', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    store.sweepOrphanFiles.mockResolvedValue({ removed: 2 });

    expect((await run()).status).toBe(401);
    expect((await run('Bearer wrong')).status).toBe(401);
    expect(store.sweepOrphanFiles).not.toHaveBeenCalled();

    const res = await run('Bearer s3cret');
    expect(await res.json()).toEqual({ success: true, removed: 2 });
  });
});
