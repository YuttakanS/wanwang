import { apiUrl } from '~/constants/config';

export interface EventLink {
  slug: string;
  adminKey: string | null;
}

// SecureStore key names allow only these characters, and the API caps slugs at 100.
const SLUG_RE = /^[A-Za-z0-9_-]{1,100}$/;

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

function decode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

/**
 * Accepts https://host/e/<slug>, wanwang://e/<slug>, either with #admin=<key>, or a bare slug.
 * Written by hand because URL in React Native does not parse custom schemes the same way on
 * every system.
 */
export function parseEventLink(input: string): EventLink | null {
  const text = input.trim();
  if (!text) return null;

  const hashAt = text.indexOf('#');
  const beforeHash = hashAt === -1 ? text : text.slice(0, hashAt);
  const fragment = hashAt === -1 ? '' : text.slice(hashAt + 1);
  const path = beforeHash.split('?')[0];

  const match = path.match(/^(?:https?:\/\/[^/]+\/|wanwang:\/\/)e\/([^/]+)\/?$/i);
  const rawSlug = match ? match[1] : /[:/]/.test(path) ? null : path;
  const slug = rawSlug === null ? null : decode(rawSlug);
  if (!isValidSlug(slug)) return null;

  const adminMatch = fragment.match(/^admin=([^&]+)$/);
  return { slug, adminKey: adminMatch ? decode(adminMatch[1]) : null };
}

export function buildEventUrl(slug: string): string {
  return `${apiUrl}/e/${encodeURIComponent(slug)}`;
}

/** Same form as the website's, so an admin link works in both. The fragment never reaches the server. */
export function buildAdminLink(slug: string, adminKey: string): string {
  return `${buildEventUrl(slug)}#admin=${encodeURIComponent(adminKey)}`;
}
