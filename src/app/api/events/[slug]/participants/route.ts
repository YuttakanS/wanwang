import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug, upsertParticipant, deleteParticipant } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { safeEqual, validateParticipantInput, ValidationError } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'vote');
    if (limited) return limited;

    const { slug } = await params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ error: 'ไม่พบกิจกรรมนี้' }, { status: 404 });
    }

    if (event.isClosed) {
      return NextResponse.json({ error: 'กิจกรรมนี้ปิดการโหวตแล้ว' }, { status: 400 });
    }

    const raw = await req.text();
    if (raw.length > 200_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const input = validateParticipantInput(body, event);
    const participant = await upsertParticipant(event.id, input);

    return NextResponse.json({ success: true, participant });
  } catch (err: unknown) {
    const error = err as Error;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' }, { status: 403 });
    }
    console.error('Save participant error:', err);
    return NextResponse.json({ error: 'Failed to save participant' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'vote');
    if (limited) return limited;

    const { slug } = await params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ error: 'ไม่พบกิจกรรมนี้' }, { status: 404 });
    }

    const participantId = new URL(req.url).searchParams.get('id');
    if (!participantId) {
      return NextResponse.json({ error: 'Missing participant id' }, { status: 400 });
    }

    const asAdmin = safeEqual(req.headers.get('x-admin-key'), event.adminKey);
    const editToken = req.headers.get('x-edit-token') || undefined;

    const success = await deleteParticipant(event.id, participantId, { asAdmin, editToken });

    if (!success) {
      return NextResponse.json({ error: 'ไม่สามารถลบข้อมูลได้ (สิทธิ์ไม่ถูกต้อง)' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete participant error:', err);
    return NextResponse.json({ error: 'Failed to delete participant' }, { status: 500 });
  }
}
