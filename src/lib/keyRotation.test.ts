import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAdminKeyFormat } from './adminKeyFormat';
import { outcomeOfFailure, settleRotation, type RotationOutcome } from './keyRotation';
import { newAdminKey, requestRotation } from './rotateAdminKey';

const NEW_KEY = '0123456789abcdef0123456789abcdef';
const ask = (outcome: RotationOutcome) => async () => outcome;
const live = (value: boolean | null) => vi.fn(async () => value);

describe('settleRotation', () => {
  it('takes a clear success without asking again', async () => {
    const isLive = live(null);
    await expect(settleRotation(NEW_KEY, ask({ status: 'done', adminKey: NEW_KEY }), isLive)).resolves.toEqual({
      status: 'done',
      adminKey: NEW_KEY,
    });
    expect(isLive).not.toHaveBeenCalled();
  });

  it('keeps the key the server reports, even when it is not the one proposed', async () => {
    const other = 'f'.repeat(32);
    await expect(settleRotation(NEW_KEY, ask({ status: 'done', adminKey: other }), live(null))).resolves.toEqual({
      status: 'done',
      adminKey: other,
    });
  });

  it('is done when the answer was lost but the new key already works', async () => {
    await expect(settleRotation(NEW_KEY, ask({ status: 'unknown' }), live(true))).resolves.toEqual({
      status: 'done',
      adminKey: NEW_KEY,
    });
  });

  it('is done when a repeat was refused on the way but the new key already works', async () => {
    // The first attempt went through, and a proxy or firewall answered 403 to the second.
    await expect(settleRotation(NEW_KEY, ask({ status: 'refused' }), live(true))).resolves.toEqual({
      status: 'done',
      adminKey: NEW_KEY,
    });
  });

  it('is refused only when the server also says the new key does not work', async () => {
    await expect(settleRotation(NEW_KEY, ask({ status: 'refused' }), live(false))).resolves.toEqual({ status: 'refused' });
  });

  it('stays unknown when a refusal cannot be checked, so the key is kept', async () => {
    await expect(settleRotation(NEW_KEY, ask({ status: 'refused' }), live(null))).resolves.toEqual({ status: 'unknown' });
  });

  it('stays unknown when the answer was lost and the new key does not work yet', async () => {
    // The request may still be on its way, so the key is kept for the next try.
    await expect(settleRotation(NEW_KEY, ask({ status: 'unknown' }), live(false))).resolves.toEqual({ status: 'unknown' });
    await expect(settleRotation(NEW_KEY, ask({ status: 'unknown' }), live(null))).resolves.toEqual({ status: 'unknown' });
  });
});

describe('outcomeOfFailure', () => {
  it.each([0, 429, 500, 502, 503])('treats %i as no answer', status => {
    expect(outcomeOfFailure(status)).toEqual({ status: 'unknown' });
  });

  it.each([400, 401, 403, 404])('treats %i as a refusal', status => {
    expect(outcomeOfFailure(status)).toEqual({ status: 'refused' });
  });
});

describe('newAdminKey', () => {
  it('makes a key the server accepts, different each time', () => {
    const a = newAdminKey();
    expect(isAdminKeyFormat(a)).toBe(true);
    expect(newAdminKey()).not.toBe(a);
  });
});

describe('requestRotation', () => {
  const fetchMock = vi.fn();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const calls = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the proposed key with the current one', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, adminKey: NEW_KEY }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'done', adminKey: NEW_KEY });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/events/abc123/admin-key');
    expect(init.headers['x-admin-key']).toBe('old-key');
    expect(JSON.parse(init.body)).toEqual({ newKey: NEW_KEY });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('finds out that a change went through when its answer was lost', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValueOnce(json({ event: { slug: 'abc123' }, isAdmin: true }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'done', adminKey: NEW_KEY });
    expect(calls()).toEqual(['POST /api/events/abc123/admin-key', 'GET /api/events/abc123']);
    expect(fetchMock.mock.calls[1][1].headers['x-admin-key']).toBe(NEW_KEY);
  });

  it('is refused when the server says no and the new key does not work', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'no' }, 403));
    fetchMock.mockResolvedValueOnce(json({ event: { slug: 'abc123' }, isAdmin: false }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'refused' });
  });

  it('keeps the key when a 403 cannot be confirmed with the server', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>blocked</html>', { status: 403 }));
    fetchMock.mockResolvedValueOnce(new Response('<html>blocked</html>', { status: 403 }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'unknown' });
  });

  it('does not take a page that is not the event for an answer', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'no' }, 403));
    fetchMock.mockResolvedValueOnce(json({ isAdmin: false }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'unknown' });
  });

  it.each([429, 500])('keeps the key after a %i', async status => {
    fetchMock.mockResolvedValueOnce(json({ error: 'x' }, status));
    fetchMock.mockResolvedValueOnce(json({ event: { slug: 'abc123' }, isAdmin: false }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'unknown' });
  });

  it('takes the key of a server that picked its own', async () => {
    // A server from before proposals ignores the body and answers with a key of its own.
    const picked = 'a'.repeat(32);
    fetchMock.mockResolvedValueOnce(json({ success: true, adminKey: picked }));

    await expect(requestRotation('abc123', 'old-key', NEW_KEY)).resolves.toEqual({ status: 'done', adminKey: picked });
  });

  it('without a current key, only checks whether the new key already works', async () => {
    fetchMock.mockResolvedValueOnce(json({ event: { slug: 'abc123' }, isAdmin: true }));
    await expect(requestRotation('abc123', null, NEW_KEY)).resolves.toEqual({ status: 'done', adminKey: NEW_KEY });
    expect(calls()).toEqual(['GET /api/events/abc123']);

    fetchMock.mockResolvedValueOnce(json({ event: { slug: 'abc123' }, isAdmin: false }));
    await expect(requestRotation('abc123', null, NEW_KEY)).resolves.toEqual({ status: 'refused' });
  });
});
