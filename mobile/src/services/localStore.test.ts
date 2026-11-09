import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const failReads = { on: false };

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (name: string) => {
      if (failReads.on) throw new Error('Storage is unavailable');
      return storage.get(name) ?? null;
    },
    setItem: async (name: string, value: string) => {
      storage.set(name, value);
    },
  },
}));

const { loadKnownEvents, rememberEvent, setEventHidden } = await import('./localStore');

beforeEach(() => {
  storage.clear();
  failReads.on = false;
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
