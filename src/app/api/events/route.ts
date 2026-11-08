import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createEvent } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { generateSlug, validateEventInput, ValidationError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'createEvent');
    if (limited) return limited;

    const raw = await req.text();
    if (raw.length > 20_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const input = validateEventInput(body);
    const adminKey = crypto.randomBytes(16).toString('hex');

    const event = await createEvent({
      slug: generateSlug(),
      ...input,
      durationDays: 1,
      dates: [],
      adminKey,
      isClosed: false,
    });

    return NextResponse.json({ success: true, event, adminKey });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Create event error:', err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
