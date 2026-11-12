import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string>();
const remembered: string[] = [];

vi.mock('./secrets', () => ({
  getAdminKey: async (slug: string) => stored.get(`admin_${slug}`) ?? null,
  getEditToken: async (slug: string) => stored.get(`token_${slug}`) ?? null,
  saveAdminKey: async (slug: string, key: string) => {
    stored.set(`admin_${slug}`, key);
  },
}));

// Finishing a key change has its own tests in rotation.test.ts. Here it only leaves its mark.
const settled = { leavesMark: null as string | null, fails: false, calls: 0, fetchesBefore: -1 };
const marks = new Map<string, string>();
vi.mock('./rotation', () => ({
  settlePendingRotation: async (slug: string) => {
    settled.calls++;
    settled.fetchesBefore = fetchMock.mock.calls.length;
    if (settled.fails) throw new Error('Keychain is unavailable');
    if (settled.leavesMark) marks.set(slug, settled.leavesMark);
  },
}));

vi.mock('./localStore', () => ({
  getAdminLinkUnkept: async (slug: string) => marks.get(slug) ?? null,
  rememberEvent: async (slug: string) => {
    remembered.push(slug);
  },
}));

const fetchMock = vi.fn();
const { holdAdminLink, loadEvent } = await import('./loadEvent');

const VALID_KEY = 'valid';

function respondAsServer(_url: string, init: { headers: Record<string, string> }) {
  const isAdmin = init.headers['x-admin-key'] === VALID_KEY;
  return Promise.resolve(new Response(JSON.stringify({ success: true, event: { slug: 'abc', title: 'T' }, isAdmin, participants: [] })));
}

const keysSent = () => fetchMock.mock.calls.map(call => call[1].headers['x-admin-key']);

beforeEach(() => {
  stored.clear();
  remembered.length = 0;
  marks.clear();
  Object.assign(settled, { leavesMark: null, fails: false, calls: 0, fetchesBefore: -1 });
  fetchMock.mockReset();
  fetchMock.mockImplementation(respondAsServer);
  vi.stubGlobal('fetch', fetchMock);
});

describe('loadEvent and a pending key change', () => {
  it('settles it before the event is asked for, and reports the mark it left', async () => {
    settled.leavesMark = 'm1';
    stored.set('admin_abc', VALID_KEY);

    const loaded = await loadEvent('abc');

    expect(settled.calls).toBe(1);
    expect(settled.fetchesBefore).toBe(0);
    expect(loaded).toMatchObject({ isAdmin: true, adminLinkUnkept: 'm1' });
  });

  it('keeps reporting the mark on every later load, until it is cleared', async () => {
    // The result of one load can be thrown away, by a retry or by a refresh that replaces it.
    marks.set('abc', 'm1');
    stored.set('admin_abc', VALID_KEY);

    expect(await loadEvent('abc')).toMatchObject({ adminLinkUnkept: 'm1' });
    expect(await loadEvent('abc')).toMatchObject({ adminLinkUnkept: 'm1' });

    marks.clear();
    expect(await loadEvent('abc')).toMatchObject({ adminLinkUnkept: null });
  });

  it('reports the mark along with a claimed admin link and with a refused one', async () => {
    marks.set('abc', 'm1');
    holdAdminLink('abc', VALID_KEY);
    expect(await loadEvent('abc')).toMatchObject({ adminLinkClaimed: true, adminLinkUnkept: 'm1' });

    holdAdminLink('abc', 'wrong');
    expect(await loadEvent('abc')).toMatchObject({ adminLinkInvalid: true, adminLinkUnkept: 'm1' });
  });

  it('still loads the event when settling fails', async () => {
    settled.fails = true;
    expect(await loadEvent('abc')).toMatchObject({ event: { slug: 'abc' }, adminLinkUnkept: null });
  });
});

describe('loadEvent', () => {
  it('uses the stored key when no link is waiting', async () => {
    stored.set('admin_abc', VALID_KEY);
    const loaded = await loadEvent('abc');
    expect(loaded).toMatchObject({ isAdmin: true, adminLinkInvalid: false, adminLinkClaimed: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores a key from a link only after the server accepts it', async () => {
    holdAdminLink('abc', VALID_KEY);
    const loaded = await loadEvent('abc');
    expect(loaded).toMatchObject({ isAdmin: true, adminLinkClaimed: true, adminLinkInvalid: false });
    expect(stored.get('admin_abc')).toBe(VALID_KEY);
    expect(remembered).toEqual(['abc']);
  });

  it('uses a link once', async () => {
    holdAdminLink('abc', VALID_KEY);
    await loadEvent('abc');
    const again = await loadEvent('abc');
    expect(again.adminLinkClaimed).toBe(false);
  });

  it('does not store a key the server rejects', async () => {
    holdAdminLink('abc', 'wrong');
    const loaded = await loadEvent('abc');
    expect(loaded).toMatchObject({ isAdmin: false, adminLinkInvalid: true });
    expect(stored.has('admin_abc')).toBe(false);
    expect(remembered).toEqual([]);
  });

  it('keeps the rights this phone already has when a link is wrong', async () => {
    stored.set('admin_abc', VALID_KEY);
    holdAdminLink('abc', 'wrong');
    const loaded = await loadEvent('abc');
    expect(keysSent()).toEqual(['wrong', VALID_KEY]);
    expect(loaded).toMatchObject({ isAdmin: true, adminLinkInvalid: true });
    expect(stored.get('admin_abc')).toBe(VALID_KEY);
  });

  it('asks only once when the wrong key is the stored one', async () => {
    stored.set('admin_abc', 'wrong');
    holdAdminLink('abc', 'wrong');
    await loadEvent('abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the link for a retry after a network failure', async () => {
    holdAdminLink('abc', VALID_KEY);
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(loadEvent('abc')).rejects.toMatchObject({ status: 0 });
    const loaded = await loadEvent('abc');
    expect(loaded.adminLinkClaimed).toBe(true);
  });

  it('holds links per event', async () => {
    holdAdminLink('other', VALID_KEY);
    await loadEvent('abc');
    expect(keysSent()).toEqual([undefined]);
    await loadEvent('other');
    expect(keysSent()).toEqual([undefined, VALID_KEY]);
  });
});
