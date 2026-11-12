import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAdminLinkPending,
  forgetEvent,
  getPendingRotation,
  getStoredAdminKey,
  isAdminLinkPending,
  listPendingRotationSlugs,
  listStoredAdminKeys,
  markAdminLinkPending,
  markAdminLinkUnkept,
  setPendingRotation,
  storeAdminKey,
} from './adminAccess';
import { settlePendingRotation } from './rotateAdminKey';

/** Enough of the browser's Storage for adminAccess.ts. */
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (name: string) => items.get(name) ?? null,
    setItem: (name: string, value: string) => void items.set(name, value),
    removeItem: (name: string) => void items.delete(name),
    key: (index: number) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
  };
}

const OLD_KEY = 'f'.repeat(32);
const NEW_KEY = '0123456789abcdef0123456789abcdef';

/** A stand-in for the server: one event, which can be unreachable. */
const server = { key: OLD_KEY, offline: false, rotations: 0 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn(async (url: string, init: { method?: string; headers: Record<string, string>; body?: string }) => {
  if (server.offline) throw new TypeError('Failed to fetch');
  const presented = init.headers['x-admin-key'];
  if (url.endsWith('/admin-key')) {
    server.rotations++;
    const proposed = JSON.parse(init.body ?? '{}').newKey;
    if (proposed !== server.key && presented !== server.key) return json({ error: 'wrong key' }, 403);
    server.key = proposed;
    return json({ success: true, adminKey: server.key });
  }
  return json({ event: { slug: 'abc123' }, isAdmin: presented === server.key, participants: [] });
});

beforeEach(() => {
  Object.assign(server, { key: OLD_KEY, offline: false, rotations: 0 });
  fetchMock.mockClear();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('fetch', fetchMock);
  storeAdminKey('abc123', OLD_KEY);
});
afterEach(() => vi.unstubAllGlobals());

describe('settlePendingRotation', () => {
  it('does nothing and asks nothing when no change is pending', async () => {
    await expect(settlePendingRotation('abc123')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('takes over a change the server made while the answer was lost', async () => {
    server.key = NEW_KEY;
    setPendingRotation('abc123', NEW_KEY);

    await expect(settlePendingRotation('abc123')).resolves.toBe(NEW_KEY);

    expect(getStoredAdminKey('abc123')).toBe(NEW_KEY);
    expect(getPendingRotation('abc123')).toBeNull();
    // The event page then reminds the creator to keep the new link.
    expect(isAdminLinkPending('abc123')).toBe(true);
  });

  it('finishes a change the server never saw', async () => {
    setPendingRotation('abc123', NEW_KEY);

    await expect(settlePendingRotation('abc123')).resolves.toBe(NEW_KEY);

    expect(server.key).toBe(NEW_KEY);
    expect(getStoredAdminKey('abc123')).toBe(NEW_KEY);
  });

  it('recovers when only the pending key is left in the browser', async () => {
    server.key = NEW_KEY;
    localStorage.removeItem('wanwang_admin_abc123');
    setPendingRotation('abc123', NEW_KEY);

    await expect(settlePendingRotation('abc123')).resolves.toBe(NEW_KEY);

    expect(getStoredAdminKey('abc123')).toBe(NEW_KEY);
    expect(server.rotations).toBe(0);
  });

  it('drops a pending key the server says is not the key, and leaves the stored one alone', async () => {
    storeAdminKey('abc123', 'not-the-key');
    setPendingRotation('abc123', NEW_KEY);

    await expect(settlePendingRotation('abc123')).resolves.toBeNull();

    expect(getPendingRotation('abc123')).toBeNull();
    expect(getStoredAdminKey('abc123')).toBe('not-the-key');
    expect(isAdminLinkPending('abc123')).toBe(false);
  });

  it('keeps the pending key while offline', async () => {
    server.offline = true;
    setPendingRotation('abc123', NEW_KEY);

    await expect(settlePendingRotation('abc123')).resolves.toBeNull();

    expect(getPendingRotation('abc123')).toBe(NEW_KEY);
    expect(getStoredAdminKey('abc123')).toBe(OLD_KEY);
  });
});

describe('the reminder to keep a new admin link', () => {
  /** What another tab, or this one reopened, starts with. */
  const openNewTab = () => vi.stubGlobal('sessionStorage', memoryStorage());

  it('is still there in another tab after a change settled elsewhere, such as on the home page', async () => {
    server.key = NEW_KEY;
    setPendingRotation('abc123', NEW_KEY);
    await settlePendingRotation('abc123');

    openNewTab();

    expect(isAdminLinkPending('abc123')).toBe(true);
  });

  it('goes for good once dismissed', async () => {
    setPendingRotation('abc123', NEW_KEY);
    await settlePendingRotation('abc123');

    clearAdminLinkPending('abc123');
    expect(isAdminLinkPending('abc123')).toBe(false);
    openNewTab();
    expect(isAdminLinkPending('abc123')).toBe(false);
  });

  it('after creating an event still lasts for the tab only', () => {
    markAdminLinkPending('abc123');
    expect(isAdminLinkPending('abc123')).toBe(true);
    openNewTab();
    expect(isAdminLinkPending('abc123')).toBe(false);
  });

  it('is dismissed whichever flag asked for it', () => {
    markAdminLinkPending('abc123');
    markAdminLinkUnkept('abc123');
    clearAdminLinkPending('abc123');
    expect(isAdminLinkPending('abc123')).toBe(false);
  });

  it('is not taken for an event with an admin key, and goes when the event is forgotten', () => {
    markAdminLinkUnkept('xyz789');
    expect(listStoredAdminKeys()).toEqual([{ slug: 'abc123', adminKey: OLD_KEY }]);

    markAdminLinkUnkept('abc123');
    forgetEvent('abc123');
    expect(isAdminLinkPending('abc123')).toBe(false);
    expect(isAdminLinkPending('xyz789')).toBe(true);
  });
});

describe('pending key changes in storage', () => {
  it('lists the events that have one', () => {
    expect(listPendingRotationSlugs()).toEqual([]);
    setPendingRotation('abc123', NEW_KEY);
    setPendingRotation('xyz789', NEW_KEY);
    expect(listPendingRotationSlugs().sort()).toEqual(['abc123', 'xyz789']);
  });

  it('are never taken for an event with an admin key', () => {
    // The list of my events is built from the admin keys, and a pending key is not one yet.
    setPendingRotation('xyz789', NEW_KEY);
    expect(listStoredAdminKeys()).toEqual([{ slug: 'abc123', adminKey: OLD_KEY }]);
  });
});
