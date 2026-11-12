import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('expo-secure-store', () => ({
  setItemAsync: async (name: string, value: string) => {
    store.set(name, value);
  },
  getItemAsync: async (name: string) => store.get(name) ?? null,
  deleteItemAsync: async (name: string) => {
    store.delete(name);
  },
}));

// A new key per call, so a test can tell a reused pending key from a fresh one.
const made = { count: 0 };
const keyNumber = (n: number) => n.toString(16).padStart(32, '0');
vi.mock('./newAdminKey', () => ({
  newAdminKey: () => keyNumber(++made.count),
}));

const { ApiError } = await import('./api');
const { rotateWithProposal, settlePendingRotation } = await import('./rotation');
const { forgetEventSecrets, getAdminKey, getPendingRotation, saveAdminKey, savePendingRotation } = await import('./secrets');

const OLD_KEY = 'f'.repeat(32);
const ADMIN = 'wanwang_admin_abc';
const PENDING = 'wanwang_rotate_pending_abc';

/** A stand-in for the server, which can lose answers and be hidden behind a proxy. */
const server = {
  key: OLD_KEY,
  /** Applies the change, then fails the request as a dropped connection would. */
  loseNextRotationAnswer: false,
  /** Every request fails before reaching the server. */
  offline: false,
  /** Every request is answered 403 by something in between, without reaching the server. */
  blocked: false,
  /** Ignores the proposed key and picks this one, like a server from before proposals. */
  picksOwnKey: null as string | null,
  rotations: [] as { header: string; proposed: unknown }[],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const fetchMock = vi.fn(async (url: string, init: { method?: string; headers: Record<string, string>; body?: string }) => {
  if (server.offline) throw new TypeError('Network request failed');
  if (server.blocked) return new Response('<html>blocked</html>', { status: 403 });

  const presented = init.headers['x-admin-key'];
  if (url.endsWith('/admin-key')) {
    const proposed = JSON.parse(init.body ?? '{}').newKey;
    server.rotations.push({ header: presented, proposed });
    const already = proposed === server.key;
    if (!already && presented !== server.key) return json({ error: 'wrong key' }, 403);
    if (!already) server.key = server.picksOwnKey ?? proposed;
    if (server.loseNextRotationAnswer) {
      server.loseNextRotationAnswer = false;
      throw new TypeError('Network request failed');
    }
    return json({ success: true, adminKey: server.key });
  }
  return json({ success: true, event: { slug: 'abc', title: 'T' }, isAdmin: presented === server.key, participants: [] });
});

beforeEach(async () => {
  await forgetEventSecrets('abc');
  store.clear();
  made.count = 0;
  Object.assign(server, { key: OLD_KEY, loseNextRotationAnswer: false, offline: false, blocked: false, picksOwnKey: null, rotations: [] });
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  await saveAdminKey('abc', OLD_KEY);
});

describe('rotateWithProposal', () => {
  it('proposes a key, stores it once the server agrees, and leaves nothing pending', async () => {
    const newKey = await rotateWithProposal('abc', OLD_KEY);

    expect(newKey).toBe(keyNumber(1));
    expect(server.key).toBe(newKey);
    expect(server.rotations).toEqual([{ header: OLD_KEY, proposed: newKey }]);
    expect(store.get(ADMIN)).toBe(newKey);
    expect(store.has(PENDING)).toBe(false);
  });

  it('remembers the proposed key before the request leaves', async () => {
    let pendingAtRequest: string | undefined;
    fetchMock.mockImplementationOnce(async () => {
      pendingAtRequest = store.get(PENDING);
      return json({ success: true, adminKey: keyNumber(1) });
    });

    await rotateWithProposal('abc', OLD_KEY);

    expect(pendingAtRequest).toBe(keyNumber(1));
  });

  it('ends with the new key when only the answer was lost', async () => {
    server.loseNextRotationAnswer = true;

    await expect(rotateWithProposal('abc', OLD_KEY)).resolves.toBe(keyNumber(1));

    expect(server.key).toBe(keyNumber(1));
    expect(store.get(ADMIN)).toBe(keyNumber(1));
    expect(store.has(PENDING)).toBe(false);
  });

  it('keeps the pending key when nothing can be learned, and fails with the cause', async () => {
    server.offline = true;

    const error = await rotateWithProposal('abc', OLD_KEY).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(store.get(ADMIN)).toBe(OLD_KEY);
    expect(store.get(PENDING)).toBe(keyNumber(1));
  });

  it('proposes the pending key again instead of a new one', async () => {
    server.offline = true;
    await rotateWithProposal('abc', OLD_KEY).catch(() => {});
    server.offline = false;

    await expect(rotateWithProposal('abc', OLD_KEY)).resolves.toBe(keyNumber(1));
    expect(made.count).toBe(1);
    expect(store.has(PENDING)).toBe(false);
  });

  it('drops the pending key when the server itself refuses', async () => {
    const error = await rotateWithProposal('abc', 'not-the-key').catch(e => e);

    expect(error.status).toBe(403);
    expect(server.key).toBe(OLD_KEY);
    expect(store.has(PENDING)).toBe(false);
    // Forgetting the stored key is left to withAdminKey, which asks the server about that key itself.
    expect(store.get(ADMIN)).toBe(OLD_KEY);
  });

  it('keeps the pending key when a 403 comes from something in between', async () => {
    // The first attempt went through and its answer was lost while offline.
    server.loseNextRotationAnswer = true;
    const settled = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementationOnce(settled).mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await rotateWithProposal('abc', OLD_KEY).catch(() => {});
    expect(server.key).toBe(keyNumber(1));
    expect(store.get(PENDING)).toBe(keyNumber(1));

    // The repeat is answered 403 by a proxy. Dropping the key here would lose the event for good.
    server.blocked = true;
    const error = await rotateWithProposal('abc', OLD_KEY).catch(e => e);
    expect(error.status).toBe(403);
    expect(store.get(PENDING)).toBe(keyNumber(1));

    server.blocked = false;
    await expect(rotateWithProposal('abc', OLD_KEY)).resolves.toBe(keyNumber(1));
    expect(store.get(ADMIN)).toBe(keyNumber(1));
  });

  it('stores the key of a server that picked its own', async () => {
    server.picksOwnKey = 'a'.repeat(32);

    await expect(rotateWithProposal('abc', OLD_KEY)).resolves.toBe('a'.repeat(32));
    expect(store.get(ADMIN)).toBe('a'.repeat(32));
    expect(store.has(PENDING)).toBe(false);
  });

  it('treats an answer without a usable key as no answer', async () => {
    fetchMock.mockImplementationOnce(async () => json({ success: true }));
    fetchMock.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });

    const error = await rotateWithProposal('abc', OLD_KEY).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(store.get(ADMIN)).toBe(OLD_KEY);
    expect(store.get(PENDING)).toBe(keyNumber(1));
  });
});

describe('settlePendingRotation', () => {
  it('does nothing and asks nothing when no change is pending', async () => {
    await expect(settlePendingRotation('abc')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('takes over a change the server made while the answer was lost', async () => {
    server.key = keyNumber(7);
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(true);

    expect(await getAdminKey('abc')).toBe(keyNumber(7));
    expect(await getPendingRotation('abc')).toBeNull();
  });

  it('finishes a change the server never saw', async () => {
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(true);

    expect(server.key).toBe(keyNumber(7));
    expect(await getAdminKey('abc')).toBe(keyNumber(7));
  });

  it('recovers when only the pending key is left on the phone', async () => {
    // The dead key was already forgotten after the server refused it.
    server.key = keyNumber(7);
    await forgetEventSecrets('abc');
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(true);

    expect(await getAdminKey('abc')).toBe(keyNumber(7));
    expect(server.rotations).toEqual([]);
  });

  it('drops a pending key the server says is not the key, and leaves the stored one alone', async () => {
    await saveAdminKey('abc', 'not-the-key');
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(false);

    expect(await getPendingRotation('abc')).toBeNull();
    expect(await getAdminKey('abc')).toBe('not-the-key');
  });

  it('keeps the pending key while offline', async () => {
    server.offline = true;
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(false);

    expect(await getPendingRotation('abc')).toBe(keyNumber(7));
    expect(await getAdminKey('abc')).toBe(OLD_KEY);
  });

  it('only cleans up when the pending key is already the stored one', async () => {
    await saveAdminKey('abc', keyNumber(7));
    await savePendingRotation('abc', keyNumber(7));

    await expect(settlePendingRotation('abc')).resolves.toBe(false);

    expect(await getPendingRotation('abc')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
