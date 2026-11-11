export type EventCategory =
  | 'hangout'
  | 'trip'
  | 'sport'
  | 'boardgame'
  | 'meeting'
  | 'general';

export interface EventCategoryInfo {
  id: EventCategory;
  label: string;
  tag: string;
}

export const EVENT_CATEGORIES: EventCategoryInfo[] = [
  { id: 'hangout', label: 'สังสรรค์ / กินข้าว', tag: '[HANGOUT]' },
  { id: 'trip', label: 'ทริปเที่ยว / พักผ่อน', tag: '[TRIP]' },
  { id: 'sport', label: 'กีฬา / ออกกำลังกาย', tag: '[SPORT]' },
  { id: 'boardgame', label: 'บอร์ดเกม / เล่นเกม', tag: '[GAME]' },
  { id: 'meeting', label: 'มีตติ้ง / ทำงานกลุ่ม', tag: '[MEETING]' },
  { id: 'general', label: 'กิจกรรมทั่วไป', tag: '[GENERAL]' },
];

export type TimeGranularity = 'day' | 'daypart' | 'hour';

export type DayPartId = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DayPartConfig {
  id: DayPartId;
  labelKey: string;
  rangeKey: string;
  startHour: string;
  endHour: string;
  timeRangeTh: string;
  timeRangeEn: string;
}

export const DAY_PARTS: DayPartConfig[] = [
  {
    id: 'morning',
    labelKey: 'daypartMorning',
    rangeKey: 'morningRange',
    startHour: '06:00',
    endHour: '12:00',
    timeRangeTh: '06:00 - 12:00 น.',
    timeRangeEn: '06:00 - 12:00',
  },
  {
    id: 'afternoon',
    labelKey: 'daypartAfternoon',
    rangeKey: 'afternoonRange',
    startHour: '12:00',
    endHour: '17:00',
    timeRangeTh: '12:00 - 17:00 น.',
    timeRangeEn: '12:00 - 17:00',
  },
  {
    id: 'evening',
    labelKey: 'daypartEvening',
    rangeKey: 'eveningRange',
    startHour: '17:00',
    endHour: '21:00',
    timeRangeTh: '17:00 - 21:00 น.',
    timeRangeEn: '17:00 - 21:00',
  },
  {
    id: 'night',
    labelKey: 'daypartNight',
    rangeKey: 'nightRange',
    startHour: '21:00',
    endHour: '24:00',
    timeRangeTh: '21:00 - 24:00 น.',
    timeRangeEn: '21:00 - 24:00',
  },
];

export interface WanWangEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  category: EventCategory;
  granularity?: TimeGranularity;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  durationDays?: number;
  confirmedDate?: string;
  dates: string[];
  startTime: string;
  endTime: string;
  slotInterval: number;
  adminKey: string;
  isClosed: boolean;
  /** Extra questions each respondent answers. Answers are shown only to the creator. */
  questions?: EventQuestion[];
  /** Most people allowed in one slot; null or missing means no limit. */
  maxPerSlot?: number | null;
  /** Most slots one person may pick; null or missing means no limit. */
  maxPicks?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const QUESTION_TYPES = ['text', 'choice', 'multi', 'file'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface EventQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  /** For 'choice' (pick one) and 'multi' (pick any). */
  options?: string[];
}

export interface FileAnswer {
  /** Storage path, "<event id>/<file id>[.ext]". */
  path: string;
  /** The name the file had on the sender's device. */
  name: string;
  size: number;
}

export type AnswerValue = string | string[] | FileAnswer;
export type Answers = Record<string, AnswerValue>;

// supabase/schema.sql sets the same file size on the storage bucket.
export const QUESTION_LIMITS = {
  maxQuestions: 10,
  label: 200,
  maxOptions: 20,
  option: 100,
  textAnswer: 1000,
  fileName: 120,
  fileBytes: 20 * 1024 * 1024,
  maxPerSlot: 1000,
} as const;

export function isFileAnswer(v: unknown): v is FileAnswer {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && typeof (v as FileAnswer).path === 'string';
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  note?: string;
  /** Only present on the response to the participant's own save; never sent for others. */
  editToken?: string;
  /** Set by GET /api/events/[slug] when the request's x-edit-token matches. */
  isMine?: boolean;
  availability: string[];
  availableDates?: string[];
  /** Keyed by question id. Sent only to the event's creator and to the person who answered. */
  answers?: Answers;
  createdAt: string;
  updatedAt: string;
}

/** Max slots per event and per vote. "Select all" must fit, so events above this are refused. */
export const MAX_EVENT_SLOTS = 10000;

/** Max events per POST /api/events/lookup; the client splits larger lists. */
export const MAX_ADMIN_LOOKUP = 50;

export interface AdminEventSummary {
  slug: string;
  title: string;
  isClosed: boolean;
  createdAt: string;
  participantCount: number;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
}

export interface SlotHeatmapInfo {
  slotId: string;
  date: string;
  time: string;
  availableCount: number;
  totalParticipants: number;
  percentage: number;
  availableNames: string[];
  unavailableNames: string[];
}

export interface BestTimeMatch {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  slotIds: string[];
  availableCount: number;
  totalParticipants: number;
  percentage: number;
  availableNames: string[];
  missingNames: string[];
  dayOfWeekThai: string;
  formattedThai: string;
  dayPartLabel?: string;
}

export const FEEDBACK_TYPES = ['bug', 'idea', 'praise', 'other'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
// supabase/schema.sql enforces the same limit.
export const FEEDBACK_MAX_LENGTH = 1000;
