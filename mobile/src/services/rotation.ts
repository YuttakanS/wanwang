// The app's half of changing an admin key. The rules are in src/lib/keyRotation.ts.
//
// The server keeps only a hash, so a new key whose answer is lost on the way back would be gone for
// good. The app therefore picks the key, stores it as pending before asking, and afterwards works
// out what really happened.
import { outcomeOfFailure, type RotationOutcome, settleRotation } from '@/lib/keyRotation';
import { ApiError, fetchEvent, rotateAdminKey } from './api';
import { markAdminLinkUnkept } from './localStore';
import { newAdminKey } from './newAdminKey';
import { forgetPendingRotation, getAdminKey, getPendingRotation, saveAdminKey, savePendingRotation } from './secrets';

/** Whether the server accepts this key as the event's admin key. Null when it cannot be told. */
async function isKeyLive(slug: string, key: string): Promise<boolean | null> {
  try {
    return (await fetchEvent(slug, { adminKey: key })).isAdmin;
  } catch {
    return null;
  }
}

/** Without a current key there is nothing to ask with, only whether an earlier attempt went through. */
async function attempt(slug: string, currentKey: string | null, proposed: string): Promise<{ outcome: RotationOutcome; failure: unknown }> {
  let failure: unknown = null;
  const outcome = await settleRotation(
    proposed,
    async () => {
      if (!currentKey) return { status: 'refused' };
      try {
        return { status: 'done', adminKey: await rotateAdminKey(slug, currentKey, proposed) };
      } catch (error) {
        failure = error;
        return error instanceof ApiError ? outcomeOfFailure(error.status) : { status: 'unknown' };
      }
    },
    () => isKeyLive(slug, proposed),
  );
  return { outcome, failure };
}

async function finish(slug: string, proposed: string, outcome: RotationOutcome): Promise<void> {
  if (outcome.status === 'done') {
    // The old key stopped working on the server, so the new one is stored at once. The mark makes the
    // screen remind the creator to keep the new link, for as long as it takes, restarts included.
    const [stored] = await Promise.all([saveAdminKey(slug, outcome.adminKey), markAdminLinkUnkept(slug)]);
    // A write that failed leaves the key in memory only, and the pending copy is then the one that
    // survives the app being closed. It goes once the key is really in the store, or when it is not
    // the key at all, which is what a server from before proposals leaves behind.
    if (stored || outcome.adminKey !== proposed) await forgetPendingRotation(slug);
  } else if (outcome.status === 'refused') {
    await forgetPendingRotation(slug);
  }
  // Unknown: the pending key stays, because it may already be the only one that works.
}

/**
 * Changes the admin key and resolves to the new one. A key left pending by an earlier attempt is
 * proposed again, so both attempts agree on the result whichever of them the server saw.
 */
export async function rotateWithProposal(slug: string, currentKey: string): Promise<string> {
  const proposed = (await getPendingRotation(slug)) ?? newAdminKey();
  // Nothing has changed on the server yet, so this is the moment to stop: a key held only in memory
  // would be lost with the app if the answer went missing.
  if (!(await savePendingRotation(slug, proposed))) throw new Error('The new admin key could not be stored');

  const { outcome, failure } = await attempt(slug, currentKey, proposed);
  await finish(slug, proposed, outcome);
  if (outcome.status === 'done') return outcome.adminKey;
  throw failure ?? new ApiError('Admin key change failed', 0);
}

/**
 * Finishes a key change that was asked for and never confirmed. Run before an event loads, since the
 * stored key may already be dead.
 */
export async function settlePendingRotation(slug: string): Promise<void> {
  const proposed = await getPendingRotation(slug);
  if (!proposed) return;

  const storedKey = await getAdminKey(slug);
  if (storedKey === proposed) {
    // Already the admin key, and only the clean-up was interrupted. Writing it again says whether it
    // is in the store or only in memory, and the pending copy is kept in the second case.
    if (await saveAdminKey(slug, proposed)) await forgetPendingRotation(slug);
    return;
  }

  const { outcome } = await attempt(slug, storedKey, proposed);
  await finish(slug, proposed, outcome);
}
