import { NextRequest, NextResponse } from 'next/server';
import { getAdminEventSummaries } from '@/lib/db';
import { MAX_ADMIN_LOOKUP } from '@/types';

// POST rather than GET so admin keys stay out of URLs and request logs.
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 20_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: { items?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { items } = body;
    if (!Array.isArray(items) || items.length > MAX_ADMIN_LOOKUP) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    const valid = items.every(
      i =>
        typeof i?.slug === 'string' &&
        typeof i?.adminKey === 'string' &&
        i.slug.length <= 100 &&
        i.adminKey.length <= 100
    );
    if (!valid) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    const events = await getAdminEventSummaries(items);
    return NextResponse.json({ success: true, events });
  } catch (err: unknown) {
    console.error('Event lookup error:', err);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}
