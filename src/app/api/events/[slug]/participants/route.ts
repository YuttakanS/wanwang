import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug, getParticipantsByEventId, upsertParticipant, deleteParticipant } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { LIMITS, validateParticipantInput, ValidationError, verifySecret } from '@/lib/validation';
import { FileStoreUnavailable, filePathsIn, removeFiles, storedFileSize } from '@/lib/fileStore';
import { isFileAnswer } from '@/types';

/** fullSlots lets the form mark exactly which slots filled up while it was open. */
const slotFull = (fullSlots: string[]) =>
  NextResponse.json(
    { error: 'ช่วงเวลาที่เลือกเต็มแล้ว กรุณาเลือกใหม่ (A slot you picked is now full)', code: 'SLOT_FULL', fullSlots },
    { status: 409 }
  );

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
    // Vercel cuts responses at 4.5 MB and GET /api/events/[slug] returns every vote, so stop taking
    // votes while the full list still fits.
    const existing = await getParticipantsByEventId(event.id);
    const others = existing.filter(p => p.id !== input.id);
    if (JSON.stringify(others).length + JSON.stringify(input).length > LIMITS.maxEventPayloadBytes) {
      return NextResponse.json({ error: 'กิจกรรมนี้มีผู้โหวตเต็มแล้ว (Event is full)', code: 'EVENT_FULL' }, { status: 409 });
    }
    const previous = existing.find(p => p.id === input.id);

    // A full slot stays open to the people already in it, so they can still edit their answer.
    // The database trigger enforces the same limit for two saves that arrive together.
    if (event.maxPerSlot) {
      const taken = new Map<string, number>();
      for (const p of others) for (const s of p.availability) taken.set(s, (taken.get(s) ?? 0) + 1);
      const mine = new Set(previous?.availability ?? []);
      const fullSlots = input.availability.filter(s => !mine.has(s) && (taken.get(s) ?? 0) >= event.maxPerSlot!);
      if (fullSlots.length > 0) return slotFull(fullSlots);
    }

    // A newly attached file must really have been uploaded; its size comes from storage, not the client.
    const previousFiles = new Set(filePathsIn(previous?.answers));
    for (const answer of Object.values(input.answers)) {
      if (!isFileAnswer(answer) || previousFiles.has(answer.path)) continue;
      const size = await storedFileSize(answer.path);
      if (size === null) {
        return NextResponse.json({ error: 'ไม่พบไฟล์ที่แนบ กรุณาแนบใหม่ (Attached file not found)' }, { status: 400 });
      }
      answer.size = size;
    }

    const participant = await upsertParticipant(event.id, input);

    // Files this answer replaced or dropped.
    const kept = new Set(filePathsIn(input.answers));
    await removeFiles([...previousFiles].filter(path => !kept.has(path)));

    return NextResponse.json({ success: true, participant });
  } catch (err: unknown) {
    const error = err as Error;
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' }, { status: 403 });
    }
    if (error?.message === 'SLOT_FULL') return slotFull([]);
    if (err instanceof FileStoreUnavailable) {
      return NextResponse.json({ error: 'ระบบแนบไฟล์ยังไม่พร้อมใช้งาน (File uploads are not available)' }, { status: 503 });
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

    const asAdmin = verifySecret(req.headers.get('x-admin-key'), event.adminKey);
    const editToken = req.headers.get('x-edit-token') || undefined;

    // Read before deleting: afterwards nothing says which files were this person's.
    const hasFileQuestion = event.questions?.some(q => q.type === 'file');
    const target = hasFileQuestion
      ? (await getParticipantsByEventId(event.id)).find(p => p.id === participantId)
      : undefined;

    const success = await deleteParticipant(event.id, participantId, { asAdmin, editToken });

    if (!success) {
      return NextResponse.json({ error: 'ไม่สามารถลบข้อมูลได้ (สิทธิ์ไม่ถูกต้อง)' }, { status: 403 });
    }
    await removeFiles(filePathsIn(target?.answers));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete participant error:', err);
    return NextResponse.json({ error: 'Failed to delete participant' }, { status: 500 });
  }
}
