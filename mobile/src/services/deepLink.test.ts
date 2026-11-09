import { describe, expect, it } from 'vitest';
import { apiUrl } from '~/constants/config';
import { buildAdminLink, buildEventUrl, isValidSlug, parseEventLink, parseEventUrl, routeForSystemUrl } from './deepLink';

describe('parseEventLink', () => {
  it.each([
    ['https://wanwang-one.vercel.app/e/abc123', 'abc123'],
    ['http://192.168.1.10:3000/e/abc123/', 'abc123'],
    ['https://wanwang-one.vercel.app/e/abc123?utm=line', 'abc123'],
    ['wanwang://e/abc123', 'abc123'],
    ['wanwang:///e/abc123', 'abc123'],
    ['exp://192.168.1.101:8081/--/e/abc123', 'abc123'],
    ['/e/abc123', 'abc123'],
    ['e/abc123', 'abc123'],
    ['wanwang-one.vercel.app/e/abc123', 'abc123'],
    ['ดูนี่ https://wanwang-one.vercel.app/e/abc123 ขอบคุณ', 'abc123'],
    ['นัดกินข้าว\n👉 https://wanwang-one.vercel.app/e/abc123', 'abc123'],
    ['  abc123\n', 'abc123'],
  ])('reads the slug from %s', (input, slug) => {
    expect(parseEventLink(input)).toEqual({ slug, adminKey: null });
  });

  it('reads the admin key from the fragment', () => {
    expect(parseEventLink('https://x.app/e/abc#admin=k%2F1')).toEqual({ slug: 'abc', adminKey: 'k/1' });
    expect(parseEventLink('wanwang://e/abc#admin=key')).toEqual({ slug: 'abc', adminKey: 'key' });
    expect(parseEventLink('exp://192.168.1.101:8081/--/e/abc#admin=key')).toEqual({ slug: 'abc', adminKey: 'key' });
  });

  it('ignores other fragments', () => {
    expect(parseEventLink('https://x.app/e/abc#top')).toEqual({ slug: 'abc', adminKey: null });
  });

  it('ignores an admin key too long to be real', () => {
    expect(parseEventLink(`https://x.app/e/abc#admin=${'k'.repeat(101)}`)).toEqual({ slug: 'abc', adminKey: null });
  });

  it('ignores an admin key that an HTTP header could not carry', () => {
    expect(parseEventLink('https://x.app/e/abc#admin=%E0%B8%81')).toEqual({ slug: 'abc', adminKey: null });
    expect(parseEventLink('https://x.app/e/abc#admin=a%0Ab')).toEqual({ slug: 'abc', adminKey: null });
  });

  it.each([
    '',
    '   ',
    'https://x.app/',
    'https://x.app/about/abc',
    'https://x.app/e/a/b',
    'ftp://x/e/abc',
    'exp://192.168.1.101:8081/--/',
    'มีภาษาไทย',
    'a b',
    'นัด abc123',
    'https://x.app/e/%E0%A4%A',
  ])('refuses %j', input => {
    expect(parseEventLink(input)).toBeNull();
  });
});

describe('parseEventUrl', () => {
  it('does not take a bare word for a slug', () => {
    expect(parseEventUrl('create')).toBeNull();
    expect(parseEventLink('create')).toEqual({ slug: 'create', adminKey: null });
  });
});

describe('routeForSystemUrl', () => {
  it('sends an event link to its screen', () => {
    expect(routeForSystemUrl('https://wanwang-one.vercel.app/e/abc?x=1')).toEqual({ href: '/e/abc', adminKey: null });
  });

  it('takes the admin key out of the route', () => {
    const route = routeForSystemUrl('wanwang://e/abc#admin=secret');
    expect(route).toEqual({ href: '/e/abc', adminKey: 'secret' });
    expect(route?.href).not.toContain('secret');
  });

  it('never passes on an admin key from a link it cannot read', () => {
    expect(routeForSystemUrl('wanwang://e/a%20b#admin=secret')).toEqual({ href: '/', adminKey: null });
    expect(routeForSystemUrl('wanwang://other#admin=secret')).toEqual({ href: '/', adminKey: null });
  });

  it.each(['wanwang://', 'wanwang:///', '/', '', 'exp://192.168.1.101:8081/--/', 'wanwang://create'])('leaves %j to the router', url => {
    expect(routeForSystemUrl(url)).toBeNull();
  });
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
