import { ApiError, fetchEvent } from './api';
import { forgetAdminKeyIfCurrent, getAdminKey } from './secrets';

// The server keeps only hashes, so a secret forgotten here is gone for good. A 403 can also come from
// a proxy or a firewall, so each check below asks the server directly, and any doubt keeps the secret.

async function isAdminKeyRejected(slug: string, adminKey: string): Promise<boolean> {
  try {
    return !(await fetchEvent(slug, { adminKey })).isAdmin;
  } catch {
    return false;
  }
}

export async function isEditTokenRejected(slug: string, editToken: string): Promise<boolean> {
  try {
    return !(await fetchEvent(slug, { editToken })).participants.some(participant => participant.isMine);
  } catch {
    return false;
  }
}

/** Runs an admin action, and forgets the key only once the server confirms it no longer works. */
export async function withAdminKey<T>(slug: string, action: (adminKey: string) => Promise<T>, onAdminLost?: () => void): Promise<T> {
  const adminKey = await getAdminKey(slug);
  if (!adminKey) throw new ApiError('Missing admin key', 403);
  try {
    return await action(adminKey);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403 && (await isAdminKeyRejected(slug, adminKey))) {
      await forgetAdminKeyIfCurrent(slug, adminKey);
      onAdminLost?.();
    }
    throw error;
  }
}
