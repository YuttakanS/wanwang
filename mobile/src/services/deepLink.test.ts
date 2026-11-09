import { describe, expect, it } from 'vitest';
import { apiUrl } from '~/constants/config';
import { buildAdminLink, buildEventUrl, isValidSlug, parseEventLink } from './deepLink';

describe('parseEventLink', () => {
  it.each([
    ['https://wanwang-one.vercel.app/e/abc123', 'abc123'],
    ['http://192.168.1.10:3000/e/abc123/', 'abc123'],
    ['https://wanwang-one.vercel.app/e/abc123?utm=line', 'abc123'],
    ['wanwang://e/abc123', 'abc123'],
    ['  abc123\n', 'abc123'],
  ])('reads the slug from %s', (input, slug) => {
    expect(parseEventLink(input)).toEqual({ slug, adminKey: null });
  });

  it('reads the admin key from the fragment', () => {
    expect(parseEventLink('https://x.app/e/abc#admin=k%2F1')).toEqual({ slug: 'abc', adminKey: 'k/1' });
    expect(parseEventLink('wanwang://e/abc#admin=key')).toEqual({ slug: 'abc', adminKey: 'key' });
  });

  it('ignores other fragments', () => {
    expect(parseEventLink('https://x.app/e/abc#top')).toEqual({ slug: 'abc', adminKey: null });
  });

  it.each(['', '   ', 'https://x.app/', 'https://x.app/about/abc', 'https://x.app/e/a/b', 'ftp://x/e/abc', 'มีภาษาไทย', 'a b', 'https://x.app/e/%E0%A4%A'])(
    'refuses %j',
    input => {
      expect(parseEventLink(input)).toBeNull();
    },
  );
});

describe('isValidSlug', () => {
  it('accepts only what is safe as a SecureStore key name', () => {
    expect(isValidSlug('abc-1_Z')).toBe(true);
    expect(isValidSlug('a'.repeat(101))).toBe(false);
    expect(isValidSlug('a/b')).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(['abc'])).toBe(false);
  });
});

describe('links', () => {
  it('round-trips an admin link', () => {
    const link = buildAdminLink('abc', 'k/1');
    expect(link).toBe(`${apiUrl}/e/abc#admin=k%2F1`);
    expect(parseEventLink(link)).toEqual({ slug: 'abc', adminKey: 'k/1' });
  });

  it('keeps the share link free of secrets', () => {
    expect(buildEventUrl('abc')).toBe(`${apiUrl}/e/abc`);
  });
});
