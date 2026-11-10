import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent } from '@/test/fixtures';

const mocks = vi.hoisted(() => ({
  getEventBySlug: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/db', () => ({ getEventBySlug: mocks.getEventBySlug }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('./EventPageClient', () => ({ default: () => null }));

import EventDetailPage from './page';

const render = (slug: string) => EventDetailPage({ params: Promise.resolve({ slug }) });

describe('/e/[slug] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls notFound for an unknown slug, so the response is a 404', async () => {
    mocks.getEventBySlug.mockResolvedValue(null);

    await expect(render('nope')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getEventBySlug).toHaveBeenCalledWith('nope');
  });

  it('renders the event page for a known slug', async () => {
    mocks.getEventBySlug.mockResolvedValue(makeEvent());

    const page = await render('abc123');

    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(page.props).toEqual({ slug: 'abc123' });
  });
});
