import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string>();

vi.mock('./secrets', () => ({
  getAdminKey: async (slug: string) => stored.get(slug) ?? null,
  forgetAdminKeyIfCurrent: async (slug: string, key: string) => {
    if (stored.get(slug) === key) stored.delete(slug);
  },
}));

const { ApiError } = await import('./api');
const { isEditTokenRejected, withAdminKey } = await import('./secretGuards');

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const eventAnswer = (fields: object) => json({ success: true, event: { slug: 'abc' }, participants: [], ...fields });
const refused = () => Promise.reject(new ApiError('Refused', 403));

beforeEach(() => {
  stored.clear();
  stored.set('abc', 'key');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('withAdminKey', () => {
  it('passes the stored key to the action', async () => {
    await expect(withAdminKey('abc', async key => key)).resolves.toBe('key');
  });

  it('forgets the key once the server confirms it no longer works', async () => {
    fetchMock.mockResolvedValue(eventAnswer({ isAdmin: false }));
    const onAdminLost = vi.fn();

    await expect(withAdminKey('abc', refused, onAdminLost)).rejects.toMatchObject({ status: 403 });

    expect(stored.has('abc')).toBe(false);
    expect(onAdminLost).toHaveBeenCalledOnce();
  });

  it('keeps a key the server still accepts, whatever refused the action', async () => {
    fetchMock.mockResolvedValue(eventAnswer({ isAdmin: true }));
    const onAdminLost = vi.fn();

    await expect(withAdminKey('abc', refused, onAdminLost)).rejects.toMatchObject({ status: 403 });

    expect(stored.get('abc')).toBe('key');
    expect(onAdminLost).not.toHaveBeenCalled();
  });

  it.each([
    ['a proxy blocks the check too', () => Promise.resolve(new Response('<html>Blocked</html>', { status: 403 }))],
    ['the connection drops', () => Promise.reject(new TypeError('Network request failed'))],
    ['the server is failing', () => Promise.resolve(json({ error: 'Failed' }, 500))],
    ['the event seems gone', () => Promise.resolve(json({ error: 'Not found' }, 404))],
    ['a proxy answers 200 with something else', () => Promise.resolve(json({}))],
  ])('keeps the key when %s', async (_name, answer) => {
    fetchMock.mockImplementation(answer);

    await expect(withAdminKey('abc', refused)).rejects.toMatchObject({ status: 403 });

    expect(stored.get('abc')).toBe('key');
  });

  it('does not question the key on other failures', async () => {
    await expect(withAdminKey('abc', () => Promise.reject(new ApiError('Failed', 500)))).rejects.toMatchObject({ status: 500 });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(stored.get('abc')).toBe('key');
  });

  it('refuses without asking the server when no key is stored', async () => {
    stored.clear();
    const action = vi.fn();

    await expect(withAdminKey('abc', action)).rejects.toMatchObject({ status: 403 });

    expect(action).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isEditTokenRejected', () => {
  it('is true only when the server no longer finds the answer', async () => {
    fetchMock.mockResolvedValueOnce(eventAnswer({ participants: [{ id: 'p1', isMine: false }] }));
    await expect(isEditTokenRejected('abc', 'token')).resolves.toBe(true);

    fetchMock.mockResolvedValueOnce(eventAnswer({ participants: [{ id: 'p1', isMine: true }] }));
    await expect(isEditTokenRejected('abc', 'token')).resolves.toBe(false);
  });

  it('keeps the token when the check fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(isEditTokenRejected('abc', 'token')).resolves.toBe(false);
  });
});
