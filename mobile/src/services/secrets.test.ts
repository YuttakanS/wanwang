import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const failWrites = { on: false };

vi.mock('expo-secure-store', () => ({
  setItemAsync: async (name: string, value: string) => {
    if (failWrites.on) throw new Error('Keychain is locked');
    store.set(name, value);
  },
  getItemAsync: async (name: string) => store.get(name) ?? null,
  deleteItemAsync: async (name: string) => {
    store.delete(name);
  },
}));

const { forgetAdminKeyIfCurrent, forgetEventSecrets, getAdminKey, getEditToken, saveAdminKey, saveEditToken } = await import('./secrets');

beforeEach(async () => {
  failWrites.on = false;
  await forgetEventSecrets('abc');
  store.clear();
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
