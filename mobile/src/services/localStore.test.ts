import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const failReads = { on: false };
const failWrites = { on: false };

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (name: string) => {
      if (failReads.on) throw new Error('Storage is unavailable');
      return storage.get(name) ?? null;
    },
    setItem: async (name: string, value: string) => {
      if (failWrites.on) throw new Error('Storage is full');
      storage.set(name, value);
    },
    removeItem: async (name: string) => {
      storage.delete(name);
    },
  },
}));

const { clearAdminLinkUnkept, forgetKnownEvent, getAdminLinkUnkept, loadKnownEvents, markAdminLinkUnkept, rememberEvent, setEventHidden } =
  await import('./localStore');

beforeEach(() => {
  storage.clear();
  failReads.on = false;
  failWrites.on = false;
});

describe('the mark for an admin link not yet put away', () => {
  it('is there after a key change, until it is cleared', async () => {
    expect(await getAdminLinkUnkept('abc')).toBeNull();

    await markAdminLinkUnkept('abc');
    const mark = await getAdminLinkUnkept('abc');
    expect(mark).toEqual(expect.any(String));
    expect(storage.get('wanwang_admin_link_unkept_abc')).toBe(mark);
    expect(await getAdminLinkUnkept('xyz')).toBeNull();

    // Clearing hands back the mark it removed, for a screen that had not seen it yet.
    await expect(clearAdminLinkUnkept('abc')).resolves.toBe(mark);
    expect(await getAdminLinkUnkept('abc')).toBeNull();
    expect(storage.has('wanwang_admin_link_unkept_abc')).toBe(false);
    await expect(clearAdminLinkUnkept('abc')).resolves.toBeNull();
  });

  it('lasts for the run when it cannot be written', async () => {
    failWrites.on = true;
    await markAdminLinkUnkept('abc');
    expect(storage.size).toBe(0);
    expect(await getAdminLinkUnkept('abc')).toEqual(expect.any(String));
    await clearAdminLinkUnkept('abc');
    expect(await getAdminLinkUnkept('abc')).toBeNull();
  });

  it('is read back from storage after a restart', async () => {
    // Written by an earlier run: nothing is held in memory for it.
    storage.set('wanwang_admin_link_unkept_abc', '1700000000000');
    expect(await getAdminLinkUnkept('abc')).toBe('1700000000000');
  });

  it('goes with the event when the event is forgotten', async () => {
    await rememberEvent('abc', 'A');
    await markAdminLinkUnkept('abc');
    await forgetKnownEvent('abc');
    expect(await getAdminLinkUnkept('abc')).toBeNull();
    expect((await loadKnownEvents()).map(event => event.slug)).toEqual([]);
  });
});

describe('the list of known events', () => {
  it('keeps both of two changes made close together', async () => {
    await Promise.all([rememberEvent('a', 'A'), rememberEvent('b', 'B')]);
    expect((await loadKnownEvents()).map(event => event.slug)).toEqual(['b', 'a']);
  });

  it('survives a failed read during a change', async () => {
    await rememberEvent('a', 'A');
    failReads.on = true;
    await rememberEvent('b', 'B');
    await setEventHidden('a', true);
    failReads.on = false;
    expect(await loadKnownEvents()).toEqual([{ slug: 'a', title: 'A' }]);
  });

  it('reads as empty when storage fails, without throwing', async () => {
    failReads.on = true;
    await expect(loadKnownEvents()).resolves.toEqual([]);
  });
});
