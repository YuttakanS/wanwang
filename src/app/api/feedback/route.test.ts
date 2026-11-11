import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_MAX_LENGTH } from '@/types';

const store = vi.hoisted(() => ({ saveFeedback: vi.fn() }));
const limiter = vi.hoisted(() => ({ rateLimit: vi.fn() }));

vi.mock('@/lib/feedback', () => store);
vi.mock('@/lib/rateLimit', () => limiter);

import { POST } from './route';

function send(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  limiter.rateLimit.mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/feedback', () => {
  it('saves trimmed feedback and nothing the client adds', async () => {
    const res = await send({ type: 'bug', rating: 4, message: '  Save button is stuck  ', email: 'a@b.c' });

    expect(res.status).toBe(200);
    expect(store.saveFeedback).toHaveBeenCalledWith({ type: 'bug', rating: 4, message: 'Save button is stuck' });
  });

  it('accepts a message with no type or rating', async () => {
    const res = await send({ message: 'Nice app' });

    expect(res.status).toBe(200);
    expect(store.saveFeedback).toHaveBeenCalledWith({ type: 'other', rating: null, message: 'Nice app' });
  });

  it.each([
    ['an empty message', { message: '   ' }],
    ['a message over the limit', { message: 'x'.repeat(FEEDBACK_MAX_LENGTH + 1) }],
    ['an unknown type', { type: 'spam', message: 'hi' }],
    ['a rating out of range', { rating: 6, message: 'hi' }],
    ['a fractional rating', { rating: 2.5, message: 'hi' }],
    ['a rating sent as text', { rating: '5', message: 'hi' }],
    ['a body that is not an object', [1, 2]],
    ['broken JSON', '{nope'],
  ])('rejects %s', async (_name, body) => {
    const res = await send(body);

    expect(res.status).toBe(400);
    expect(store.saveFeedback).not.toHaveBeenCalled();
  });

  it('rejects an oversized payload', async () => {
    const res = await send({ message: 'x'.repeat(6000) });

    expect(res.status).toBe(413);
    expect(store.saveFeedback).not.toHaveBeenCalled();
  });

  it('stops before saving when rate limited', async () => {
    limiter.rateLimit.mockResolvedValue(NextResponse.json({ error: 'slow down' }, { status: 429 }));

    const res = await send({ message: 'hi' });

    expect(res.status).toBe(429);
    expect(store.saveFeedback).not.toHaveBeenCalled();
  });

  it('answers 500 without leaking the cause when saving fails', async () => {
    store.saveFeedback.mockRejectedValue(new Error('relation "feedback" does not exist'));

    const res = await send({ message: 'hi' });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to save feedback' });
  });
});
