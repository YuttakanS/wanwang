import { NextRequest, NextResponse } from 'next/server';
import { rotateAdminKey } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const currentKey = req.headers.get('x-admin-key');
    if (!currentKey) {
      return NextResponse.json({ error: 'Missing Admin Key' }, { status: 401 });
    }

    const adminKey = await rotateAdminKey(slug, currentKey);
    if (!adminKey) {
      return NextResponse.json({ error: 'รหัส Admin ไม่ถูกต้อง หรือไม่พบกิจกรรม' }, { status: 403 });
    }

    return NextResponse.json({ success: true, adminKey });
  } catch (err: unknown) {
    console.error('Rotate admin key error:', err);
    return NextResponse.json({ error: 'Failed to change admin key' }, { status: 500 });
  }
}
