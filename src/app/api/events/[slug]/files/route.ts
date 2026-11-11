import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug, getParticipantsByEventId } from '@/lib/db';
import {
  EVENT_FILE_QUOTA,
  FileStoreUnavailable,
  createDownloadUrl,
  createUpload,
  eventFileUsage,
} from '@/lib/fileStore';
import { rateLimit } from '@/lib/rateLimit';
import { isEventFilePath, verifySecret } from '@/lib/validation';
import { QUESTION_LIMITS, isFileAnswer } from '@/types';

const unavailable = () =>
  NextResponse.json({ error: 'ระบบแนบไฟล์ยังไม่พร้อมใช้งาน (File uploads are not available)' }, { status: 503 });

/** Asks for a place to upload one file for a file question. The file itself goes straight to storage. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'upload');
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
    if (raw.length > 2_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    let body: Record<string, unknown> | null;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const question = (event.questions ?? []).find(q => q.id === body?.questionId && q.type === 'file');
    if (!question) {
      return NextResponse.json({ error: 'This event has no such file question' }, { status: 400 });
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > QUESTION_LIMITS.fileName) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }
    const size = body?.size;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }
    if (size > QUESTION_LIMITS.fileBytes) {
      return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (File is too large)' }, { status: 413 });
    }

    const usage = await eventFileUsage(event.id);
    if (usage.files >= EVENT_FILE_QUOTA.files || usage.bytes + size > EVENT_FILE_QUOTA.bytes) {
      return NextResponse.json(
        { error: 'กิจกรรมนี้รับไฟล์เต็มแล้ว (This event cannot take more files)' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, ...(await createUpload(event.id, name)) });
  } catch (err: unknown) {
    if (err instanceof FileStoreUnavailable) return unavailable();
    console.error('Create upload error:', err);
    return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 });
  }
}

/** A short-lived download link, for the event's creator or the person who attached the file. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimit(req, 'admin');
    if (limited) return limited;

    const { slug } = await params;
    const event = await getEventBySlug(slug);
    if (!event) {
      return NextResponse.json({ error: 'ไม่พบกิจกรรมนี้' }, { status: 404 });
    }

    const path = new URL(req.url).searchParams.get('path');
    if (!isEventFilePath(path, event.id)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const isAdmin = verifySecret(req.headers.get('x-admin-key'), event.adminKey);
    const myToken = req.headers.get('x-edit-token');

    // Looked up in the answers: that is where the original name is, and it limits downloads to
    // files someone actually submitted.
    for (const p of await getParticipantsByEventId(event.id)) {
      const file = Object.values(p.answers ?? {}).filter(isFileAnswer).find(f => f.path === path);
      if (!file) continue;
      if (!isAdmin && !verifySecret(myToken, p.editToken)) break;
      return NextResponse.json({ success: true, url: await createDownloadUrl(file.path, file.name) });
    }

    // The same answer whether the file is missing or not yours, so paths cannot be probed.
    return NextResponse.json({ error: 'ไม่พบไฟล์ หรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
  } catch (err: unknown) {
    if (err instanceof FileStoreUnavailable) return unavailable();
    console.error('Download file error:', err);
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 });
  }
}
