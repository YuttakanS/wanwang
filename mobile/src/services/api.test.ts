import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '~/constants/config';
import { ApiError, createEvent, deleteParticipant, fetchEvent, lookupAdminEvents, saveParticipant, shouldRetryRequest } from './api';

const fetchMock = vi.fn();

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), init);
const sentHeaders = (call = 0) => fetchMock.mock.calls[call][1].headers as Record<string, string>;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request errors', () => {
  it('keeps the status, message and Retry-After of a 429', async () => {
    fetchMock.mockResolvedValue(json({ error: 'too many' }, { status: 429, headers: { 'Retry-After': '42' } }));

    const error = await fetchEvent('abc', {}).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: 'too many', retryAfterSeconds: 42 });
  });

  it('reports a failed connection as status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchEvent('abc', {})).rejects.toMatchObject({ status: 0 });
  });

  it('keeps the status when an error page is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(fetchEvent('abc', {})).rejects.toMatchObject({ status: 502 });
  });

  it('treats a successful answer that is not JSON as a failure', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 200 }));
    await expect(fetchEvent('abc', {})).rejects.toBeInstanceOf(ApiError);
  });
});

describe('secrets', () => {
  it('sends them as headers and never in the URL or body', async () => {
    fetchMock.mockResolvedValue(json({ success: true, event: {}, isAdmin: true, participants: [] }));

    await fetchEvent('abc', { adminKey: 'secret-key', editToken: 'secret-token' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiUrl}/api/events/abc`);
    expect(init.body).toBeUndefined();
    expect(sentHeaders()).toMatchObject({ 'x-admin-key': 'secret-key', 'x-edit-token': 'secret-token' });
  });

  it('leaves the headers out when there is nothing to send', async () => {
    fetchMock.mockResolvedValue(json({ success: true, event: {}, isAdmin: false, participants: [] }));

    await fetchEvent('abc', { adminKey: null, editToken: null });

    expect(sentHeaders()).toEqual({});
  });

  it('puts only the participant id in the URL when deleting', async () => {
    fetchMock.mockResolvedValue(json({ success: true }));

    await deleteParticipant('abc', 'p/1', { editToken: 'secret-token' });

    expect(fetchMock.mock.calls[0][0]).toBe(`${apiUrl}/api/events/abc/participants?id=p%2F1`);
    expect(sentHeaders()['x-edit-token']).toBe('secret-token');
  });
});

describe('endpoints', () => {
  it('returns the admin key the server sends once when creating', async () => {
    fetchMock.mockResolvedValue(json({ success: true, event: { slug: 'abc' }, adminKey: 'once' }));

    const result = await createEvent({
      title: 'x',
      description: '',
      location: '',
      category: 'general',
      granularity: 'day',
      dateRangeStart: '2026-12-01',
      dateRangeEnd: '2026-12-02',
    });

    expect(result).toEqual({ success: true, event: { slug: 'abc' }, adminKey: 'once' });
    expect(sentHeaders()['Content-Type']).toBe('application/json');
  });

  it('returns the saved participant', async () => {
    fetchMock.mockResolvedValue(json({ success: true, participant: { id: 'p1', editToken: 't1' } }));

    const participant = await saveParticipant('abc', { name: 'A', note: '', availability: ['2026-12-01'], answers: { q1: 'yes' } });

    expect(participant).toEqual({ id: 'p1', editToken: 't1' });
    // Leaving the answers out would make the server drop the stored ones, files included.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).answers).toEqual({ q1: 'yes' });
  });

  it('keeps the code and the slots of a 409, so a full slot can be told from a full event', async () => {
    fetchMock.mockResolvedValue(json({ error: 'full', code: 'SLOT_FULL', fullSlots: ['2026-12-01', 7] }, { status: 409 }));

    const error = await saveParticipant('abc', { name: 'A', note: '', availability: ['2026-12-01'], answers: {} }).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('SLOT_FULL');
    expect(error.fullSlots).toEqual(['2026-12-01']);
  });

  it('has no code and no slots for an error that carries none', async () => {
    fetchMock.mockResolvedValue(json({ error: 'full' }, { status: 409 }));

    const error = await saveParticipant('abc', { name: 'A', note: '', availability: ['2026-12-01'], answers: {} }).catch(e => e);

    expect(error.code).toBeUndefined();
    expect(error.fullSlots).toEqual([]);
  });

  it('splits a long lookup into lists the API accepts', async () => {
    fetchMock.mockImplementation(async () => json({ success: true, events: [{ slug: 'x' }] }));
    const items = Array.from({ length: 51 }, (_, i) => ({ slug: `s${i}`, adminKey: 'k' }));

    const events = await lookupAdminEvents(items);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).items).toHaveLength(50);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).items).toHaveLength(1);
    expect(events).toHaveLength(2);
  });

  it('sends nothing when there is nothing to look up', async () => {
    await expect(lookupAdminEvents([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('shouldRetryRequest', () => {
  it('does not retry answers that will not change', () => {
    for (const status of [400, 403, 404, 429]) {
      expect(shouldRetryRequest(0, new ApiError('x', status))).toBe(false);
    }
  });

  it('retries network and server failures a limited number of times', () => {
    expect(shouldRetryRequest(0, new ApiError('x', 0))).toBe(true);
    expect(shouldRetryRequest(1, new ApiError('x', 500))).toBe(true);
    expect(shouldRetryRequest(2, new ApiError('x', 500))).toBe(false);
  });
});
