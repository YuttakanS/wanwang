// The app's half of changing an admin key. The rules are in src/lib/keyRotation.ts.
//
// The server keeps only a hash, so a new key whose answer is lost on the way back would be gone for
// good. The app therefore picks the key, stores it as pending before asking, and afterwards works
// out what really happened.
import { outcomeOfFailure, type RotationOutcome, settleRotation } from '@/lib/keyRotation';
import { ApiError, fetchEvent, rotateAdminKey } from './api';
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

async function finish(slug: string, outcome: RotationOutcome): Promise<void> {
  if (outcome.status === 'done') {
    // The old key stopped working on the server, so the new one is stored before anything else.
    await saveAdminKey(slug, outcome.adminKey);
    await forgetPendingRotation(slug);
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
  await savePendingRotation(slug, proposed);

  const { outcome, failure } = await attempt(slug, currentKey, proposed);
  await finish(slug, outcome);
  if (outcome.status === 'done') return outcome.adminKey;
  throw failure ?? new ApiError('Admin key change failed', 0);
}

/**
 * Finishes a key change that was asked for and never confirmed. Run before an event loads, since the
 * stored key may already be dead. Resolves to true when it stored a new admin key.
 */
export async function settlePendingRotation(slug: string): Promise<boolean> {
  const proposed = await getPendingRotation(slug);
  if (!proposed) return false;

  const storedKey = await getAdminKey(slug);
  if (storedKey === proposed) {
    // Stored already, and only the clean-up after it was interrupted.
    await forgetPendingRotation(slug);
    return false;
  }

  const { outcome } = await attempt(slug, storedKey, proposed);
  await finish(slug, outcome);
  return outcome.status === 'done';
}
