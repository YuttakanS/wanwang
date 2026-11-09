import { apiUrl } from '~/constants/config';

export interface EventLink {
  slug: string;
  adminKey: string | null;
}

// SecureStore key names allow only these characters, and the API caps slugs and keys at 100.
const SLUG_RE = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_ADMIN_KEY_LENGTH = 100;

// https://host/e/x, wanwang://e/x, wanwang:///e/x, Expo Go's exp://host/--/e/x, /e/x and e/x.
const EVENT_PATH_RE = /^(?:https?:\/\/[^/]+\/|wanwang:\/\/\/?|exps?:\/\/[^/]+\/--\/|\/)?e\/([^/]+)\/?$/i;

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

function splitUrl(text: string): { path: string; fragment: string } {
  const hashAt = text.indexOf('#');
  const beforeHash = hashAt === -1 ? text : text.slice(0, hashAt);
  return { path: beforeHash.split('?')[0], fragment: hashAt === -1 ? '' : text.slice(hashAt + 1) };
}

function linkFrom(rawSlug: string, fragment: string): EventLink | null {
  const slug = decode(rawSlug);
  if (!isValidSlug(slug)) return null;

  const adminMatch = fragment.match(/^admin=([^&]+)$/);
  const adminKey = adminMatch ? decode(adminMatch[1]) : null;
  return { slug, adminKey: adminKey && adminKey.length <= MAX_ADMIN_KEY_LENGTH ? adminKey : null };
}

/** Written by hand because URL in React Native does not parse custom schemes the same way on every system. */
export function parseEventUrl(input: string): EventLink | null {
  const { path, fragment } = splitUrl(input.trim());
  const match = path.match(EVENT_PATH_RE);
  return match ? linkFrom(match[1], fragment) : null;
}

/** What a person can paste: an event URL, or just the slug. */
export function parseEventLink(input: string): EventLink | null {
  const text = input.trim();
  const fromUrl = parseEventUrl(text);
  if (fromUrl) return fromUrl;

  const { path, fragment } = splitUrl(text);
  return path && !/[:/]/.test(path) ? linkFrom(path, fragment) : null;
}

export interface SystemRoute {
  href: string;
  adminKey: string | null;
}

/**
 * Where a URL from the system should go, with the admin key taken out so it never reaches the
 * router, its state or its logs. Null leaves the URL to the router, as for a plain app launch.
 */
export function routeForSystemUrl(url: string): SystemRoute | null {
  const link = parseEventUrl(url);
  if (link) return { href: `/e/${link.slug}`, adminKey: link.adminKey };
  return url.includes('#admin=') ? { href: '/', adminKey: null } : null;
}

export function buildEventUrl(slug: string): string {
  return `${apiUrl}/e/${encodeURIComponent(slug)}`;
}

/** Same form as the website's, so an admin link works in both. The fragment never reaches the server. */
export function buildAdminLink(slug: string, adminKey: string): string {
  return `${buildEventUrl(slug)}#admin=${encodeURIComponent(adminKey)}`;
}
