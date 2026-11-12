import * as SecureStore from 'expo-secure-store';

// The server sends these once and keeps only a hash. If writing fails, for example because the
// phone locked while the response arrived, the value stays here so the rights last for this run,
// and every later read tries to write it again.
const unsaved = new Map<string, string>();

const adminName = (slug: string) => `wanwang_admin_${slug}`;
const tokenName = (slug: string) => `wanwang_token_${slug}`;
const rotationName = (slug: string) => `wanwang_rotate_pending_${slug}`;

async function write(name: string, value: string): Promise<void> {
  unsaved.set(name, value);
  try {
    await SecureStore.setItemAsync(name, value);
    if (unsaved.get(name) === value) unsaved.delete(name);
  } catch {
    // Still held in `unsaved`.
  }
}

async function read(name: string): Promise<string | null> {
  const held = unsaved.get(name);
  if (held) {
    void write(name, held);
    return held;
  }
  try {
    return await SecureStore.getItemAsync(name);
  } catch {
    return null;
  }
}

async function remove(name: string): Promise<void> {
  unsaved.delete(name);
  try {
    await SecureStore.deleteItemAsync(name);
  } catch {
    // A key left behind is rejected by the server, which leads back here.
  }
}

export const getAdminKey = (slug: string) => read(adminName(slug));
export const saveAdminKey = (slug: string, key: string) => write(adminName(slug), key);

/**
 * Compares first, so a slow request that failed with an old key cannot erase the new one from a
 * rotation that finished in the meantime. A key lost that way could never be recovered.
 */
export async function forgetAdminKeyIfCurrent(slug: string, key: string): Promise<void> {
  if ((await getAdminKey(slug)) === key) await remove(adminName(slug));
}

export const getEditToken = (slug: string) => read(tokenName(slug));
export const saveEditToken = (slug: string, token: string) => write(tokenName(slug), token);
export const forgetEditToken = (slug: string) => remove(tokenName(slug));

/**
 * A new admin key that was proposed to the server and not yet confirmed. If the change went through
 * and its answer was lost, this is the only copy, so it is kept until the server has been asked.
 */
export const getPendingRotation = (slug: string) => read(rotationName(slug));
export const savePendingRotation = (slug: string, key: string) => write(rotationName(slug), key);
export const forgetPendingRotation = (slug: string) => remove(rotationName(slug));

export async function forgetEventSecrets(slug: string): Promise<void> {
  await Promise.all([remove(adminName(slug)), remove(tokenName(slug)), remove(rotationName(slug))]);
}
