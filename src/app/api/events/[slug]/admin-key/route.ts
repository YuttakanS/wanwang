import { NextRequest, NextResponse } from 'next/server';
import { rotateAdminKey } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { isAdminKeyFormat } from '@/lib/adminKeyFormat';

/** The key the client wants: undefined when it leaves the choice to the server, null when unusable. */
async function proposedKeyIn(req: NextRequest): Promise<string | undefined | null> {
  const raw = await req.text();
  if (!raw.trim()) return undefined;
  if (raw.length > 1000) return null;
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const { newKey } = body as { newKey?: unknown };
    if (newKey === undefined) return undefined;
    return isAdminKeyFormat(newKey) ? newKey : null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'admin');
    if (limited) return limited;

    const { slug } = await params;
    const currentKey = req.headers.get('x-admin-key');
    if (!currentKey) {
      return NextResponse.json({ error: 'Missing Admin Key' }, { status: 401 });
    }

    const proposedKey = await proposedKeyIn(req);
    if (proposedKey === null) {
      return NextResponse.json({ error: 'Invalid new key' }, { status: 400 });
    }

    const adminKey = await rotateAdminKey(slug, currentKey, proposedKey);
    if (!adminKey) {
      return NextResponse.json({ error: 'รหัส Admin ไม่ถูกต้อง หรือไม่พบกิจกรรม' }, { status: 403 });
    }

    return NextResponse.json({ success: true, adminKey });
  } catch (err: unknown) {
    console.error('Rotate admin key error:', err);
    return NextResponse.json({ error: 'Failed to change admin key' }, { status: 500 });
  }
}
