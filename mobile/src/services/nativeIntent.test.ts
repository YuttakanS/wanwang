import { beforeEach, describe, expect, it, vi } from 'vitest';

const held: [string, string][] = [];
const invalidated: unknown[] = [];

vi.mock('~/services/loadEvent', () => ({
  holdAdminLink: (slug: string, key: string) => held.push([slug, key]),
}));
vi.mock('~/services/queryClient', () => ({
  queryClient: { invalidateQueries: async ({ queryKey }: { queryKey: unknown }) => invalidated.push(queryKey) },
}));
vi.mock('~/hooks/useEvent', () => ({ eventKey: (slug: string) => ['event', slug] }));

const { redirectSystemPath } = await import('../../app/+native-intent');
const redirect = (path: string) => redirectSystemPath({ path, initial: false });

beforeEach(() => {
  held.length = 0;
  invalidated.length = 0;
});

describe('redirectSystemPath', () => {
  it.each([
    ['https://wanwang-one.vercel.app/e/abc', '/e/abc'],
    ['wanwang://e/abc', '/e/abc'],
    ['exp://192.168.1.101:8081/--/e/abc', '/e/abc'],
  ])('routes %s to the event', (url, href) => {
    expect(redirect(url)).toBe(href);
    expect(held).toEqual([]);
  });

  it.each(['wanwang://e/abc#admin=secret', 'https://wanwang-one.vercel.app/e/abc#admin=secret', 'exp://192.168.1.101:8081/--/e/abc#admin=secret'])(
    'holds the key from %s and keeps it out of the route',
    url => {
      expect(redirect(url)).toBe('/e/abc');
      expect(held).toEqual([['abc', 'secret']]);
    },
  );

  it('reloads an event already on screen when a key arrives', () => {
    redirect('wanwang://e/abc#admin=secret');
    expect(invalidated).toEqual([['event', 'abc']]);
  });

  it('sends a link it cannot read home, without its key', () => {
    expect(redirect('wanwang://e/a%20b#admin=secret')).toBe('/');
    expect(held).toEqual([]);
  });

  it.each(['wanwang://', 'exp://192.168.1.101:8081/--/', '/'])('leaves a plain launch alone: %j', url => {
    expect(redirect(url)).toBe(url);
  });
});
