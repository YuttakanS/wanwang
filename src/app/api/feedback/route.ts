import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback } from '@/lib/feedback';
import { rateLimit } from '@/lib/rateLimit';
import { validateFeedbackInput, ValidationError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'feedback');
    if (limited) return limited;

    const raw = await req.text();
    if (raw.length > 5_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    await saveFeedback(validateFeedbackInput(body as Record<string, unknown>));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Save feedback error:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
