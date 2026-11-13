import { NextRequest, NextResponse } from 'next/server';
import {
  getEventBySlug,
  updateEvent,
  deleteEvent,
  getParticipantsByEventId,
} from '@/lib/db';
import { removeEventFiles } from '@/lib/fileStore';
import { rateLimit } from '@/lib/rateLimit';
import { validateEventPatch, ValidationError, verifySecret } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isRefresh = req.headers.get('x-wanwang-refresh') === '1';
    const limited = await rateLimit(req, isRefresh ? 'refresh' : 'read');
    if (limited) return limited;

    const { slug } = await params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ error: 'ไม่พบกิจกรรมนี้' }, { status: 404 });
    }

    const participants = await getParticipantsByEventId(event.id);

    const { adminKey: adminKeyHash, ...publicEvent } = event;
    const presentedKey = req.headers.get('x-admin-key');
    const isAdmin = verifySecret(presentedKey, adminKeyHash);
    const myToken = req.headers.get('x-edit-token');

    // Never expose other people's edit tokens. Answers to the creator's questions go only to the
    // creator and to the person who gave them.
    const publicParticipants = participants.map(({ editToken, answers, ...p }) => {
      const isMine = verifySecret(myToken, editToken);
      return { ...p, isMine, ...(isAdmin || isMine ? { answers: answers ?? {} } : {}) };
    });

    return NextResponse.json({
      success: true,
      // Echo the key the caller proved they hold; the stored hash never leaves the server.
      event: isAdmin ? { ...publicEvent, adminKey: presentedKey } : publicEvent,
      isAdmin,
      participants: publicParticipants,
    });
  } catch (err: unknown) {
    console.error('Get event error:', err);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'admin');
    if (limited) return limited;

    const { slug } = await params;
    const adminKey = req.headers.get('x-admin-key');

    if (!adminKey) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขกิจกรรม (Missing Admin Key)' }, { status: 401 });
    }

    const raw = await req.text();
    if (raw.length > 40_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const patch = validateEventPatch(body);
    const updated = await updateEvent(slug, adminKey, patch);

    if (!updated) {
      return NextResponse.json({ error: 'รหัส Admin ไม่ถูกต้อง หรือไม่พบกิจกรรม' }, { status: 403 });
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (err: unknown) {
    const error = err as Error;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'รหัส Admin ไม่ถูกต้อง หรือไม่พบกิจกรรม' }, { status: 403 });
    }
    if (error?.message === 'CANNOT_CHANGE_GRANULARITY_WITH_VOTES') {
      return NextResponse.json(
        { error: 'ไม่สามารถเปลี่ยนรูปแบบกรอบเวลาได้เนื่องจากมีผู้โหวตแล้ว (Cannot change time granularity after votes have been submitted)' },
        { status: 400 }
      );
    }
    if (error?.message === 'CANNOT_SHRINK_RANGE_WITH_VOTES') {
      return NextResponse.json(
        { error: 'ไม่สามารถลดช่วงวันให้แคบลงได้เนื่องจากมีผู้โหวตแล้ว ขยายได้เท่านั้น (Cannot shrink date range after votes have been submitted - expansion only)' },
        { status: 400 }
      );
    }
    console.error('Update event error:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'admin');
    if (limited) return limited;

    const { slug } = await params;
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey) {
      return NextResponse.json({ error: 'Missing Admin Key' }, { status: 401 });
    }
    // Read first: once the event is gone there is no id left to find its files by.
    const event = await getEventBySlug(slug);
    const ok = await deleteEvent(slug, adminKey);
    if (!ok) {
      return NextResponse.json({ error: 'รหัส Admin ไม่ถูกต้อง หรือไม่พบกิจกรรม' }, { status: 403 });
    }
    if (event?.questions?.some(q => q.type === 'file')) await removeEventFiles(event.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete event error:', err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
