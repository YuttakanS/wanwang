import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const failWrites = { on: false };
const failReads = { on: false };

vi.mock('expo-secure-store', () => ({
  setItemAsync: async (name: string, value: string) => {
    if (failWrites.on) throw new Error('Keychain is locked');
    store.set(name, value);
  },
  getItemAsync: async (name: string) => {
    if (failReads.on) throw new Error('Keychain is locked');
    return store.get(name) ?? null;
  },
  deleteItemAsync: async (name: string) => {
    store.delete(name);
  },
}));

const {
  forgetAdminKeyIfCurrent,
  forgetEventSecrets,
  forgetPendingRotation,
  getAdminKey,
  getEditToken,
  getPendingRotation,
  readPendingRotation,
  saveAdminKey,
  saveEditToken,
  savePendingRotation,
} = await import('./secrets');

beforeEach(async () => {
  failWrites.on = false;
  failReads.on = false;
  await forgetEventSecrets('abc');
  store.clear();
});

describe('a pending key change', () => {
  it('is kept apart from the admin key, under a name that is not mistaken for one', async () => {
    await saveAdminKey('abc', 'k');
    await savePendingRotation('abc', 'next');

    expect(store.get('wanwang_rotate_pending_abc')).toBe('next');
    expect(await getPendingRotation('abc')).toBe('next');
    expect(await getAdminKey('abc')).toBe('k');

    await forgetPendingRotation('abc');
    expect(await getPendingRotation('abc')).toBeNull();
    expect(await getAdminKey('abc')).toBe('k');
  });

  it('is not kept at all when it cannot be written, unlike the other secrets', async () => {
    // Whatever is pending gets proposed, and a key that would not survive a restart must not be.
    failWrites.on = true;
    await expect(savePendingRotation('abc', 'next')).resolves.toBe(false);
    expect(store.has('wanwang_rotate_pending_abc')).toBe(false);
    expect(await getPendingRotation('abc')).toBeNull();
  });

  it('tells a store that cannot be read from nothing being pending', async () => {
    expect(await readPendingRotation('abc')).toEqual({ key: null, failed: false });
    await savePendingRotation('abc', 'next');
    expect(await readPendingRotation('abc')).toEqual({ key: 'next', failed: false });

    failReads.on = true;
    expect(await readPendingRotation('abc')).toEqual({ key: null, failed: true });
  });

  it('goes when the event is forgotten', async () => {
    await savePendingRotation('abc', 'next');
    await forgetEventSecrets('abc');
    expect(await getPendingRotation('abc')).toBeNull();
    expect(store.size).toBe(0);
  });
});

describe('secrets', () => {
  it('uses the same key names as the plan and the website', async () => {
    await saveAdminKey('abc', 'k');
    await saveEditToken('abc', 't');
    expect(store.get('wanwang_admin_abc')).toBe('k');
    expect(store.get('wanwang_token_abc')).toBe('t');
    expect(await getAdminKey('abc')).toBe('k');
    expect(await getEditToken('abc')).toBe('t');
  });

  it('says whether a secret reached the store', async () => {
    await expect(saveAdminKey('abc', 'k')).resolves.toBe(true);
    failWrites.on = true;
    await expect(saveAdminKey('abc', 'k2')).resolves.toBe(false);
    await expect(savePendingRotation('abc', 'next')).resolves.toBe(false);
  });

  it('keeps a key it could not write, and writes it on a later read', async () => {
    failWrites.on = true;
    await saveAdminKey('abc', 'only-copy');
    expect(store.has('wanwang_admin_abc')).toBe(false);
    expect(await getAdminKey('abc')).toBe('only-copy');

    failWrites.on = false;
    expect(await getAdminKey('abc')).toBe('only-copy');
    await vi.waitFor(() => expect(store.get('wanwang_admin_abc')).toBe('only-copy'));
  });

  it('prefers a newer key it could not write over the older stored one', async () => {
    await saveAdminKey('abc', 'old');
    failWrites.on = true;
    await saveAdminKey('abc', 'new');
    expect(await getAdminKey('abc')).toBe('new');
  });

  it('does not let a request that failed with an old key erase the new one', async () => {
    await saveAdminKey('abc', 'new');
    await forgetAdminKeyIfCurrent('abc', 'old');
    expect(await getAdminKey('abc')).toBe('new');
  });

  it('forgets the key that was actually rejected', async () => {
    await saveAdminKey('abc', 'rejected');
    await forgetAdminKeyIfCurrent('abc', 'rejected');
    expect(await getAdminKey('abc')).toBeNull();
  });

  it('forgets both secrets of a deleted event, including one it could not write', async () => {
    await saveEditToken('abc', 't');
    failWrites.on = true;
    await saveAdminKey('abc', 'k');
    await forgetEventSecrets('abc');
    expect(await getAdminKey('abc')).toBeNull();
    expect(await getEditToken('abc')).toBeNull();
  });
});
