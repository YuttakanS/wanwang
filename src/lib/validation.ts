import crypto from 'crypto';
import {
  EVENT_CATEGORIES,
  EventCategory,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_TYPES,
  FeedbackType,
  MAX_EVENT_SLOTS,
  QUESTION_LIMITS,
  QUESTION_TYPES,
  TimeGranularity,
  WanWangEvent,
} from '@/types';
import type { Answers, EventQuestion, QuestionType } from '@/types';
import { countEventSlots, generateAllEventSlots } from './timeUtils';

export const LIMITS = {
  title: 100,
  description: 500,
  location: 100,
  name: 50,
  note: 300,
  maxRangeDays: 366,
  maxSlots: MAX_EVENT_SLOTS,
  maxEventPayloadBytes: 3_500_000,
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

/**
 * For admin keys and edit tokens. Both are 128-bit random, so a fast unsalted
 * hash is enough. Must match the migrations in schema.sql.
 */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function verifySecret(presented: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (!presented) return false;
  return safeEqual(hashSecret(presented), storedHash);
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
  questions: EventQuestion[];
  maxPerSlot: number | null;
  maxPicks: number | null;
}

const QUESTION_ID_RE = /^[a-z0-9]{6,12}$/;

/**
 * The creator's question list. Ids the client sends are kept so answers already given stay
 * attached to their question when the list is edited; a new question gets an id here.
 */
export function validateQuestions(raw: unknown): EventQuestion[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('questions must be a list');
  if (raw.length > QUESTION_LIMITS.maxQuestions) {
    throw new ValidationError(`Too many questions (max ${QUESTION_LIMITS.maxQuestions})`);
  }

  const seen = new Set<string>();
  return raw.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ValidationError('Invalid question');
    const q = item as Record<string, unknown>;

    if (typeof q.type !== 'string' || !(QUESTION_TYPES as readonly string[]).includes(q.type)) {
      throw new ValidationError('Invalid question type');
    }
    const type = q.type as QuestionType;
    const label = str(q.label, QUESTION_LIMITS.label, `question ${i + 1}`, true);

    let id = typeof q.id === 'string' && QUESTION_ID_RE.test(q.id) ? q.id : generateSlug(8);
    while (seen.has(id)) id = generateSlug(8);
    seen.add(id);

    const question: EventQuestion = { id, type, label, required: q.required === true };

    if (type === 'choice' || type === 'multi') {
      if (!Array.isArray(q.options)) throw new ValidationError(`question ${i + 1} needs options`);
      const options = Array.from(
        new Set(q.options.map(o => str(o, QUESTION_LIMITS.option, 'option')).filter(Boolean))
      );
      if (options.length === 0) throw new ValidationError(`question ${i + 1} needs options`);
      if (options.length > QUESTION_LIMITS.maxOptions) {
        throw new ValidationError(`Too many options (max ${QUESTION_LIMITS.maxOptions})`);
      }
      question.options = options;
    }
    return question;
  });
}

/** A whole number from 1 to max; null, '' or missing means "no limit". */
function optionalLimit(v: unknown, max: number, field: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > max) {
    throw new ValidationError(`${field} must be a whole number from 1 to ${max}`);
  }
  return v;
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

  const startTime = body.startTime ?? '09:00';
  const endTime = body.endTime ?? '22:00';
  // The type check matters: RegExp.test turns ['09:00'] into a matching string.
  const isTime = (t: unknown): t is string => typeof t === 'string' && TIME_RE.test(t);
  if (!isTime(startTime) || !isTime(endTime) || startTime >= endTime) throw new ValidationError('Invalid time window');

  const slotInterval = Number(body.slotInterval ?? 60);
  if (slotInterval !== 30 && slotInterval !== 60) throw new ValidationError('Invalid slot interval');

  if (countEventSlots(g, rangeDays(start, end), startTime, endTime, slotInterval) > LIMITS.maxSlots) {
    throw new ValidationError(`Too many time slots (max ${LIMITS.maxSlots})`);
  }

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
    questions: validateQuestions(body.questions),
    maxPerSlot: optionalLimit(body.maxPerSlot, QUESTION_LIMITS.maxPerSlot, 'maxPerSlot'),
    maxPicks: optionalLimit(body.maxPicks, LIMITS.maxSlots, 'maxPicks'),
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
  questions?: EventQuestion[];
  maxPerSlot?: number | null;
  maxPicks?: number | null;
}

/** Whitelist PATCH fields (blocks overriding id/slug/adminKey). */
export function validateEventPatch(body: Record<string, unknown>): ValidEventPatch {
  const out: ValidEventPatch = {};
  if (body.questions !== undefined) out.questions = validateQuestions(body.questions);
  // null clears a limit.
  if (body.maxPerSlot !== undefined) {
    out.maxPerSlot = optionalLimit(body.maxPerSlot, QUESTION_LIMITS.maxPerSlot, 'maxPerSlot');
  }
  if (body.maxPicks !== undefined) out.maxPicks = optionalLimit(body.maxPicks, LIMITS.maxSlots, 'maxPicks');
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
  answers: Answers;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILE_PATH_RE = new RegExp(`^(${UUID})/${UUID}(\\.[a-z0-9]{1,10})?$`);

/** True for a storage path this event could have issued. Stops an answer pointing at another event's file. */
export function isEventFilePath(path: unknown, eventId: string): path is string {
  if (typeof path !== 'string') return false;
  const match = FILE_PATH_RE.exec(path);
  return Boolean(match) && match![1] === eventId;
}

/** Keeps only answers to this event's questions, each checked against its question. */
export function validateAnswers(raw: unknown, event: WanWangEvent): Answers {
  const questions = event.questions ?? [];
  if (questions.length === 0) return {};
  const given: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const answers: Answers = {};
  for (const q of questions) {
    const v = given[q.id];
    const missing = () => {
      if (q.required) throw new ValidationError(`Please answer: ${q.label}`);
    };

    if (q.type === 'text') {
      const text = str(v, QUESTION_LIMITS.textAnswer, q.label);
      if (text) answers[q.id] = text;
      else missing();
    } else if (q.type === 'choice') {
      if (v === undefined || v === null || v === '') missing();
      else if (typeof v === 'string' && q.options?.includes(v)) answers[q.id] = v;
      else throw new ValidationError(`Invalid answer: ${q.label}`);
    } else if (q.type === 'multi') {
      if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) missing();
      else if (Array.isArray(v) && v.every(o => typeof o === 'string' && q.options?.includes(o))) {
        answers[q.id] = Array.from(new Set(v as string[]));
      } else throw new ValidationError(`Invalid answer: ${q.label}`);
    } else {
      if (v === undefined || v === null) missing();
      else {
        const f = v as Record<string, unknown>;
        if (typeof v !== 'object' || !isEventFilePath(f.path, event.id)) {
          throw new ValidationError(`Invalid file: ${q.label}`);
        }
        const name = str(f.name, QUESTION_LIMITS.fileName, 'file name', true);
        const size = typeof f.size === 'number' && f.size >= 0 ? f.size : 0;
        answers[q.id] = { path: f.path, name, size };
      }
    }
  }
  return answers;
}

export function validateParticipantInput(
  body: Record<string, unknown>,
  event: WanWangEvent
): ValidParticipantInput {
  const name = str(body.name, LIMITS.name, 'name', true);
  const note = str(body.note, LIMITS.note, 'note');

  // A save is always a full answer, so it must pick at least one of this event's own slots.
  const raw = body.availability !== undefined ? body.availability : body.availableDates;
  if (!Array.isArray(raw)) throw new ValidationError('availability must be an array of slot ids');
  if (raw.length === 0) throw new ValidationError('Pick at least one slot');
  if (raw.length > LIMITS.maxSlots) throw new ValidationError('Too many slots');

  const valid = new Set(generateAllEventSlots(event).map(s => s.id));
  if (!raw.every(s => typeof s === 'string' && valid.has(s))) {
    throw new ValidationError('availability contains a slot that is not in this event');
  }
  const availability = Array.from(new Set(raw as string[]));
  if (event.maxPicks && availability.length > event.maxPicks) {
    throw new ValidationError(`Pick at most ${event.maxPicks} slots`);
  }

  const id = typeof body.id === 'string' && body.id ? body.id : undefined;
  const editToken = typeof body.editToken === 'string' && body.editToken ? body.editToken : undefined;

  return { id, name, note, editToken, availability, answers: validateAnswers(body.answers, event) };
}

export interface ValidFeedbackInput {
  type: FeedbackType;
  rating: number | null;
  message: string;
}

/** Whitelists the fields, so anything else the client sends is dropped. */
export function validateFeedbackInput(body: Record<string, unknown>): ValidFeedbackInput {
  const type = body.type ?? 'other';
  if (typeof type !== 'string' || !(FEEDBACK_TYPES as readonly string[]).includes(type)) {
    throw new ValidationError('Invalid feedback type');
  }

  let rating: number | null = null;
  if (body.rating !== undefined && body.rating !== null) {
    if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      throw new ValidationError('Invalid rating');
    }
    rating = body.rating;
  }

  const message = str(body.message, FEEDBACK_MAX_LENGTH, 'message', true);
  return { type: type as FeedbackType, rating, message };
}
