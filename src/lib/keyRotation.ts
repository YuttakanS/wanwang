// Shared by the website and the app, so it must not import anything.
//
// Changing an admin key is the one request whose answer must not be lost: the server keeps only
// a hash, so a new key that never reached the client is gone. The client therefore picks the key,
// remembers it before asking, and works out afterwards what really happened.

export type RotationOutcome =
  | { status: 'done'; adminKey: string }
  /** The server itself said no, so nothing changed and the remembered key can be dropped. */
  | { status: 'refused' }
  /** No trustworthy answer. The change may have happened, so the remembered key must be kept. */
  | { status: 'unknown' };

/**
 * Decides what an attempt to change the key came to.
 *
 * `ask` sends the request. Anything but a clear success is then checked with `isNewKeyLive`,
 * which asks the server whether the new key works (null when it cannot tell). That check is what
 * makes it safe to drop the remembered key: a "no" can also come from a proxy or a firewall on a
 * repeat of a request that had in fact succeeded, and dropping the key then would lose it for good.
 */
export async function settleRotation(
  newKey: string,
  ask: () => Promise<RotationOutcome>,
  isNewKeyLive: () => Promise<boolean | null>
): Promise<RotationOutcome> {
  const answer = await ask();
  if (answer.status === 'done') return answer;

  const live = await isNewKeyLive();
  if (live === true) return { status: 'done', adminKey: newKey };
  return answer.status === 'refused' && live === false ? { status: 'refused' } : { status: 'unknown' };
}

/** How to read the status of an answer that was not a success. */
export function outcomeOfFailure(httpStatus: number): RotationOutcome {
  // No answer at all (0), a rate limit and a server error say nothing about whether the key changed.
  return httpStatus === 0 || httpStatus === 429 || httpStatus >= 500 ? { status: 'unknown' } : { status: 'refused' };
}
