import { type EventDetails, fetchEvent } from './api';
import { getAdminLinkUnkept, rememberEvent } from './localStore';
import { settlePendingRotation } from './rotation';
import { getAdminKey, getEditToken, saveAdminKey } from './secrets';

// Admin keys from links wait here, in memory only, until the server has answered. Storing one
// before that would let a wrong link replace a key that works.
const heldAdminLinks = new Map<string, string>();

export function holdAdminLink(slug: string, adminKey: string): void {
  heldAdminLinks.set(slug, adminKey);
}

export interface LoadedEvent extends EventDetails {
  adminLinkInvalid: boolean;
  /** True when this load stored a new admin key, so the list of events has something new. */
  adminLinkClaimed: boolean;
  /**
   * Set while the admin key has changed and its new link has not been put away. The value names the
   * change, so a screen can tell a notice it already dismissed from a new one.
   */
  adminLinkUnkept: string | null;
}

/** The held key stays until an answer arrives, so a retry after a network failure still uses it. */
export async function loadEvent(slug: string): Promise<LoadedEvent> {
  // First, because the stored key may already be dead while the only copy of the new one waits.
  await settlePendingRotation(slug).catch(() => {});
  const adminLinkUnkept = await getAdminLinkUnkept(slug);

  const linkKey = heldAdminLinks.get(slug) ?? null;
  const [storedKey, editToken] = await Promise.all([getAdminKey(slug), getEditToken(slug)]);

  const details = await fetchEvent(slug, { adminKey: linkKey ?? storedKey, editToken });
  if (!linkKey) return { ...details, adminLinkInvalid: false, adminLinkClaimed: false, adminLinkUnkept };

  if (details.isAdmin) {
    await saveAdminKey(slug, linkKey);
    await rememberEvent(slug, details.event.title);
    heldAdminLinks.delete(slug);
    return { ...details, adminLinkInvalid: false, adminLinkClaimed: true, adminLinkUnkept };
  }

  // A bad link must not hide rights this phone already has.
  const withStoredKey = storedKey && storedKey !== linkKey ? await fetchEvent(slug, { adminKey: storedKey, editToken }) : details;
  heldAdminLinks.delete(slug);
  return { ...withStoredKey, adminLinkInvalid: true, adminLinkClaimed: false, adminLinkUnkept };
}
