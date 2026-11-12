// Client-side half of changing an admin key.
//
// The browser picks the new key and remembers it before asking, so an answer lost on the way
// back does not lose the key: asking again with the same key gets the same answer.
import { bytesToHex } from './adminKeyFormat';

export type RotationOutcome =
  | { status: 'done'; adminKey: string }
  /** The server said no, so the old key is still the stored one (or was never valid). */
  | { status: 'refused' }
  /** No usable answer. The change may or may not have happened. */
  | { status: 'unknown' };

export function newAdminKey(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function requestRotation(slug: string, currentKey: string, newKey: string): Promise<RotationOutcome> {
  let res: Response;
  try {
    res = await fetch(`/api/events/${encodeURIComponent(slug)}/admin-key`, {
      method: 'POST',
      headers: { 'x-admin-key': currentKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newKey }),
    });
  } catch {
    return { status: 'unknown' };
  }
  if (res.ok) {
    const data = await res.json().catch(() => null);
    return data?.adminKey === newKey ? { status: 'done', adminKey: newKey } : { status: 'unknown' };
  }
  // Rate limits and server errors say nothing about whether the key changed.
  return res.status === 429 || res.status >= 500 ? { status: 'unknown' } : { status: 'refused' };
}
