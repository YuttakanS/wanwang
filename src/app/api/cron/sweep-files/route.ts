import { NextRequest, NextResponse } from 'next/server';
import { FileStoreUnavailable, sweepOrphanFiles } from '@/lib/fileStore';
import { safeEqual } from '@/lib/validation';

/**
 * Run daily by Vercel Cron (vercel.json), which sends "Authorization: Bearer $CRON_SECRET".
 * Without CRON_SECRET set, nobody can run it.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get('authorization'), `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json({ success: true, ...(await sweepOrphanFiles()) });
  } catch (err: unknown) {
    if (err instanceof FileStoreUnavailable) {
      return NextResponse.json({ success: true, removed: 0 });
    }
    console.error('Sweep files error:', err);
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}
