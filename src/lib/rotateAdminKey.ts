// The website's half of changing an admin key. The rules are in keyRotation.ts.
import { clearPendingRotation, getPendingRotation, getStoredAdminKey, markAdminLinkPending, storeAdminKey } from './adminAccess';
import { bytesToHex, isAdminKeyFormat } from './adminKeyFormat';
import { outcomeOfFailure, settleRotation, type RotationOutcome } from './keyRotation';

export type { RotationOutcome };

export function newAdminKey(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

const eventUrl = (slug: string) => `/api/events/${encodeURIComponent(slug)}`;

async function askServer(slug: string, currentKey: string, newKey: string): Promise<RotationOutcome> {
  let res: Response;
  try {
    res = await fetch(`${eventUrl(slug)}/admin-key`, {
      method: 'POST',
      headers: { 'x-admin-key': currentKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newKey }),
    });
  } catch {
    return { status: 'unknown' };
  }
  if (!res.ok) return outcomeOfFailure(res.status);
  const data = await res.json().catch(() => null);
  // Whatever key the server reports is the one that works now, even if it is not the one proposed.
  return isAdminKeyFormat(data?.adminKey) ? { status: 'done', adminKey: data.adminKey } : { status: 'unknown' };
}

/** Whether the server accepts this key as the event's admin key. Null when it cannot be told. */
async function isKeyLive(slug: string, key: string): Promise<boolean | null> {
  try {
    const res = await fetch(eventUrl(slug), { headers: { 'x-admin-key': key }, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.isAdmin === 'boolean' && data.event ? data.isAdmin : null;
  } catch {
    return null;
  }
}

/**
 * Asks the server to make `newKey` the admin key. Without a current key there is nothing to ask
 * with, and the only question left is whether an earlier attempt already went through.
 */
export function requestRotation(slug: string, currentKey: string | null, newKey: string): Promise<RotationOutcome> {
  return settleRotation(
    newKey,
    () => (currentKey ? askServer(slug, currentKey, newKey) : Promise.resolve<RotationOutcome>({ status: 'refused' })),
    () => isKeyLive(slug, newKey)
  );
}

/**
 * Finishes a key change that was asked for and never confirmed, and resolves to the new key when
 * it stored one. The event page runs this before it loads, and the list of my events before it
 * looks them up, because until then the stored key may already be dead.
 */
export async function settlePendingRotation(slug: string): Promise<string | null> {
  const pending = getPendingRotation(slug);
  if (!pending) return null;

  const outcome = await requestRotation(slug, getStoredAdminKey(slug), pending);
  if (outcome.status === 'done') {
    storeAdminKey(slug, outcome.adminKey);
    clearPendingRotation(slug);
    // The new link is in this browser only until it is copied, so the event page reminds the creator.
    markAdminLinkPending(slug);
    return outcome.adminKey;
  }
  if (outcome.status === 'refused') clearPendingRotation(slug);
  return null;
}
