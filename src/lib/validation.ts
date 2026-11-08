import crypto from 'crypto';
import { EVENT_CATEGORIES, EventCategory, TimeGranularity, WanWangEvent } from '@/types';
import { generateAllEventSlots } from './timeUtils';

export const LIMITS = {
  title: 100,
  description: 500,
  location: 100,
  name: 50,
  note: 300,
  maxRangeDays: 366,
  maxSlots: 10000,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CATEGORY_IDS = new Set<string>(EVENT_CATEGORIES.map(c => c.id));

export class ValidationError extends Error {}

export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = crypto.createHash('sha256').update(a).digest();
  const bb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ba, bb);
}

export function generateSlug(length = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function rangeDays(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

function str(v: unknown, max: number, field: string, required = false): string {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ValidationError(`${field} is required`);
    return '';
  }
  if (typeof v !== 'string') throw new ValidationError(`${field} must be a string`);
  const t = v.trim();
  if (required && !t) throw new ValidationError(`${field} is required`);
  if (t.length > max) throw new ValidationError(`${field} too long (max ${max})`);
  return t;
}

export function validateRange(start: unknown, end: unknown): { start: string; end: string } {
  if (!isValidDate(start) || !isValidDate(end)) throw new ValidationError('Invalid date range');
  const days = rangeDays(start, end);
  if (days < 1) throw new ValidationError('End date must not be before start date');
  if (days > LIMITS.maxRangeDays) throw new ValidationError(`Date range too long (max ${LIMITS.maxRangeDays} days)`);
  return { start, end };
}

export interface ValidEventInput {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  granularity: TimeGranularity;
  dateRangeStart: string;
  dateRangeEnd: string;
  startTime: string;
  endTime: string;
  slotInterval: number;
}

export function validateEventInput(body: Record<string, unknown>): ValidEventInput {
  const title = str(body.title, LIMITS.title, 'title', true);
  const description = str(body.description, LIMITS.description, 'description');
  const location = str(body.location, LIMITS.location, 'location');

  const category = (body.category ?? 'general') as string;
  if (!CATEGORY_IDS.has(category)) throw new ValidationError('Invalid category');

  const g = body.granularity ?? 'day';
  if (g !== 'day' && g !== 'daypart' && g !== 'hour') throw new ValidationError('Invalid granularity');

  const { start, end } = validateRange(body.dateRangeStart, body.dateRangeEnd);

  const startTime = (body.startTime ?? '09:00') as string;
  const endTime = (body.endTime ?? '22:00') as string;
  const isEnd = (t: string) => TIME_RE.test(t);
  if (!isEnd(startTime) || !isEnd(endTime) || startTime >= endTime) throw new ValidationError('Invalid time window');

  const slotInterval = Number(body.slotInterval ?? 60);
  if (slotInterval !== 30 && slotInterval !== 60) throw new ValidationError('Invalid slot interval');

  return {
    title,
    description,
    location,
    category: category as EventCategory,
    granularity: g,
    dateRangeStart: start,
    dateRangeEnd: end,
    startTime,
    endTime,
    slotInterval,
  };
}

export interface ValidEventPatch {
  title?: string;
  description?: string;
  location?: string;
  category?: EventCategory;
  granularity?: TimeGranularity;
  isClosed?: boolean;
  confirmedDate?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

/** Whitelist PATCH fields (blocks overriding id/slug/adminKey). */
export function validateEventPatch(body: Record<string, unknown>): ValidEventPatch {
  const out: ValidEventPatch = {};
  if (body.title !== undefined) out.title = str(body.title, LIMITS.title, 'title', true);
  if (body.description !== undefined) out.description = str(body.description, LIMITS.description, 'description');
  if (body.location !== undefined) out.location = str(body.location, LIMITS.location, 'location');
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !CATEGORY_IDS.has(body.category)) throw new ValidationError('Invalid category');
    out.category = body.category as EventCategory;
  }
  if (body.granularity !== undefined) {
    if (body.granularity !== 'day' && body.granularity !== 'daypart' && body.granularity !== 'hour') {
      throw new ValidationError('Invalid granularity');
    }
    out.granularity = body.granularity;
  }
  if (body.isClosed !== undefined) {
    if (typeof body.isClosed !== 'boolean') throw new ValidationError('Invalid isClosed');
    out.isClosed = body.isClosed;
  }
  if (body.confirmedDate !== undefined) {
    // empty string clears the confirmed slot
    if (body.confirmedDate !== '' && (typeof body.confirmedDate !== 'string' || body.confirmedDate.length > 40)) {
      throw new ValidationError('Invalid confirmedDate');
    }
    out.confirmedDate = body.confirmedDate as string;
  }
  if (body.dateRangeStart !== undefined || body.dateRangeEnd !== undefined) {
    const { start, end } = validateRange(body.dateRangeStart, body.dateRangeEnd);
    out.dateRangeStart = start;
    out.dateRangeEnd = end;
  }
  return out;
}

export interface ValidParticipantInput {
  id?: string;
  name: string;
  note: string;
  editToken?: string;
  availability: string[];
}

export function validateParticipantInput(
  body: Record<string, unknown>,
  event: WanWangEvent
): ValidParticipantInput {
  const name = str(body.name, LIMITS.name, 'name', true);
  const note = str(body.note, LIMITS.note, 'note');

  const raw = Array.isArray(body.availability)
    ? body.availability
    : Array.isArray(body.availableDates)
    ? body.availableDates
    : [];
  if (raw.length > LIMITS.maxSlots) throw new ValidationError('Too many slots');

  const valid = new Set(generateAllEventSlots(event).map(s => s.id));
  const availability = Array.from(new Set(raw.filter((s): s is string => typeof s === 'string' && valid.has(s))));

  const id = typeof body.id === 'string' && body.id ? body.id : undefined;
  const editToken = typeof body.editToken === 'string' && body.editToken ? body.editToken : undefined;

  return { id, name, note, editToken, availability };
}
