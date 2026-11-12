// Client-side helpers for the creator's admin key. The key lives in localStorage,
// so storage access is guarded: it can throw in private windows or when blocked.
const ADMIN_PREFIX = 'wanwang_admin_';
const PENDING_PREFIX = 'wanwang_admin_link_pending_';
const HIDDEN_KEY = 'wanwang_my_events_hidden';
// Must not start with ADMIN_PREFIX, or listStoredAdminKeys would take it for an event's key.
const ROTATION_PREFIX = 'wanwang_rotate_pending_';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredAdminKey(slug: string): string | null {
  if (!hasWindow()) return null;
  try {
    return localStorage.getItem(`${ADMIN_PREFIX}${slug}`);
  } catch {
    return null;
  }
}

export function storeAdminKey(slug: string, adminKey: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(`${ADMIN_PREFIX}${slug}`, adminKey);
    // Saving a key means the user is actively using this event, so list it again.
    writeHiddenSlugs(readHiddenSlugs().filter(s => s !== slug));
  } catch {
    // Storage blocked: admin rights last only for this page view.
  }
}

/** Removes everything this browser stored for an event that no longer exists. */
export function forgetEvent(slug: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(`${ADMIN_PREFIX}${slug}`);
    localStorage.removeItem(`${ROTATION_PREFIX}${slug}`);
    localStorage.removeItem(`wanwang_token_${slug}`);
    localStorage.removeItem(`wanwang_pid_${slug}`);
    writeHiddenSlugs(readHiddenSlugs().filter(s => s !== slug));
    sessionStorage.removeItem(`${PENDING_PREFIX}${slug}`);
  } catch {
    // Storage blocked: nothing was saved for this event.
  }
}

// Hiding only affects the "My events" list. The admin key is kept, because deleting
// it could permanently lock the creator out if they never saved the admin link.
function readHiddenSlugs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeHiddenSlugs(slugs: string[]): void {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(slugs));
}

export function getHiddenSlugs(): string[] {
  return hasWindow() ? readHiddenSlugs() : [];
}

export function hideMyEvent(slug: string): void {
  if (!hasWindow()) return;
  try {
    writeHiddenSlugs(Array.from(new Set([...readHiddenSlugs(), slug])));
  } catch {
    // Storage blocked: the item stays listed.
  }
}

export function unhideAllMyEvents(): void {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Storage blocked: nothing was hidden.
  }
}

export function listStoredAdminKeys(): { slug: string; adminKey: string }[] {
  if (!hasWindow()) return [];
  try {
    const out: { slug: string; adminKey: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (!name?.startsWith(ADMIN_PREFIX)) continue;
      const adminKey = localStorage.getItem(name);
      if (adminKey) out.push({ slug: name.slice(ADMIN_PREFIX.length), adminKey });
    }
    return out;
  } catch {
    return [];
  }
}

// The key goes in the URL fragment because browsers never send fragments to the
// server or in Referer headers, so it stays out of request logs.
export function buildAdminLink(slug: string, adminKey: string): string {
  return `${window.location.origin}/e/${encodeURIComponent(slug)}#admin=${encodeURIComponent(adminKey)}`;
}

/** Reads the key from an admin link and removes it from the address bar. */
export function takeAdminKeyFromHash(): string | null {
  if (!hasWindow()) return null;
  const match = window.location.hash.match(/^#admin=([^&]+)$/);
  if (!match) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

// A key change that was asked for but not yet confirmed. The new key is kept until the server's
// answer arrives, because if the change happened and the answer was lost, this is the only copy.
export function getPendingRotation(slug: string): string | null {
  if (!hasWindow()) return null;
  try {
    return localStorage.getItem(`${ROTATION_PREFIX}${slug}`);
  } catch {
    return null;
  }
}

export function setPendingRotation(slug: string, newKey: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(`${ROTATION_PREFIX}${slug}`, newKey);
  } catch {
    // Storage blocked: a lost answer cannot be recovered, as before.
  }
}

export function clearPendingRotation(slug: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(`${ROTATION_PREFIX}${slug}`);
  } catch {
    // Nothing to clean up if storage is blocked.
  }
}

// Pending flag: show the "save your admin link" notice once after creating an event.
// sessionStorage keeps it across a refresh until the creator dismisses it.
export function markAdminLinkPending(slug: string): void {
  if (!hasWindow()) return;
  try {
    sessionStorage.setItem(`${PENDING_PREFIX}${slug}`, '1');
  } catch {
    // The notice is a convenience; the share bar still offers the link.
  }
}

export function isAdminLinkPending(slug: string): boolean {
  if (!hasWindow()) return false;
  try {
    return sessionStorage.getItem(`${PENDING_PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

export function clearAdminLinkPending(slug: string): void {
  if (!hasWindow()) return;
  try {
    sessionStorage.removeItem(`${PENDING_PREFIX}${slug}`);
  } catch {
    // Nothing to clean up if storage is blocked.
  }
}
