import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

interface Rule {
  limit: number;
  windowSeconds: number;
}

/** Per-IP limits. Generous enough for many people voting behind one shared IP. */
const RULES = {
  createEvent: { limit: 20, windowSeconds: 3600 },
  vote: { limit: 30, windowSeconds: 60 },
  admin: { limit: 30, windowSeconds: 60 },
  lookup: { limit: 30, windowSeconds: 60 },
  read: { limit: 120, windowSeconds: 60 },
  feedback: { limit: 5, windowSeconds: 3600 },
} satisfies Record<string, Rule>;

export type RateLimitBucket = keyof typeof RULES;

const MEMORY_MAX_KEYS = 10_000;
const memory = new Map<string, { count: number; resetAt: number }>();

/** Per-instance only: for dev without Supabase, and as a fallback when the RPC fails. */
function hitMemory(key: string, { limit, windowSeconds }: Rule): number {
  const now = Date.now();

  if (memory.size >= MEMORY_MAX_KEYS) {
    for (const [k, v] of memory) {
      if (v.resetAt <= now) memory.delete(k);
    }
    if (memory.size >= MEMORY_MAX_KEYS) memory.clear();
  }

  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 0;
  }

  entry.count += 1;
  return entry.count <= limit ? 0 : Math.ceil((entry.resetAt - now) / 1000);
}

/** Returns seconds to wait, or 0 if allowed. */
async function hit(key: string, rule: Rule): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (!error && typeof data === 'number') return data;
    console.error('Rate limit RPC failed, using in-memory limiter:', error);
  }
  return hitMemory(key, rule);
}

function clientIp(req: NextRequest): string {
  // Vercel overwrites x-forwarded-for, so clients cannot spoof it there.
  // Behind any other host, make sure the proxy does the same.
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** The IP is keyed-hashed so raw addresses are never stored (PDPA). */
function bucketKey(bucket: RateLimitBucket, ip: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev';
  const hash = crypto.createHmac('sha256', secret).update(ip).digest('hex');
  return `${bucket}:${hash}`;
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export async function rateLimit(
  req: NextRequest,
  bucket: RateLimitBucket
): Promise<NextResponse | null> {
  const key = bucketKey(bucket, clientIp(req));

  let retryAfter: number;
  try {
    retryAfter = await hit(key, RULES[bucket]);
  } catch (err) {
    console.error('Rate limit RPC threw, using in-memory limiter:', err);
    retryAfter = hitMemory(key, RULES[bucket]);
  }

  if (retryAfter <= 0) return null;
  return NextResponse.json(
    { error: 'ส่งคำขอถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง (Too many requests)' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
