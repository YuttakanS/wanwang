import type { AdminEventSummary, Answers, Participant, TimeGranularity, EventCategory, WanWangEvent } from '@/types';
import { MAX_ADMIN_LOOKUP } from '@/types';
import { isAdminKeyFormat } from '@/lib/adminKeyFormat';
import { apiUrl } from '~/constants/config';

const TIMEOUT_MS = 20_000;

/** What the server adds to some errors so they can be told apart, such as the two kinds of 409. */
export interface ApiErrorDetail {
  code?: string;
  /** With SLOT_FULL: the slots that filled up. Empty when the database caught it at the last moment. */
  fullSlots?: string[];
}

/** status 0 means the request never got an answer: no network, or a timeout. */
export class ApiError extends Error {
  readonly code?: string;
  readonly fullSlots: string[];

  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
    detail: ApiErrorDetail = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = detail.code;
    this.fullSlots = detail.fullSlots ?? [];
  }
}

function detailIn(data: unknown): ApiErrorDetail {
  if (!data || typeof data !== 'object') return {};
  const { code, fullSlots } = data as { code?: unknown; fullSlots?: unknown };
  return {
    code: typeof code === 'string' ? code : undefined,
    fullSlots: Array.isArray(fullSlots) ? fullSlots.filter((slot): slot is string => typeof slot === 'string') : undefined,
  };
}

export interface Credentials {
  adminKey?: string | null;
  editToken?: string | null;
}

interface RequestOptions extends Credentials {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

function parseRetryAfter(value: string | null): number | undefined {
  const seconds = Number(value);
  return value && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

async function request<T>(path: string, { method = 'GET', body, adminKey, editToken }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (adminKey) headers['x-admin-key'] = adminKey;
  if (editToken) headers['x-edit-token'] = editToken;

  // fetch has no timeout of its own, so a bad connection would otherwise spin forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  let data: (T & { error?: string }) | null;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    // An error page from a proxy is not JSON, and its status still says what happened.
    data = await response.json().catch(() => null);
  } catch {
    throw new ApiError('Network request failed', 0);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok || !data) {
    throw new ApiError(
      data?.error || `Request failed (${response.status})`,
      response.status,
      parseRetryAfter(response.headers.get('Retry-After')),
      detailIn(data),
    );
  }
  return data;
}

const eventPath = (slug: string) => `/api/events/${encodeURIComponent(slug)}`;

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  granularity: TimeGranularity;
  dateRangeStart: string;
  dateRangeEnd: string;
  /** Hourly events only. The server fills in its defaults for the others. */
  startTime?: string;
  endTime?: string;
  slotInterval?: number;
}

export interface EventDetails {
  event: WanWangEvent;
  isAdmin: boolean;
  participants: Participant[];
}

export interface SaveParticipantInput {
  id?: string;
  editToken?: string | null;
  name: string;
  note: string;
  availability: string[];
  /** Always sent: the server replaces the stored answers with these, and drops files left out. */
  answers: Answers;
}

export type EventPatch = Partial<
  Pick<
    WanWangEvent,
    'isClosed' | 'confirmedDate' | 'title' | 'description' | 'location' | 'category' | 'dateRangeStart' | 'dateRangeEnd'
  >
>;

export async function createEvent(input: CreateEventInput): Promise<{ event: WanWangEvent; adminKey: string }> {
  return request('/api/events', { method: 'POST', body: input });
}

export async function fetchEvent(slug: string, credentials: Credentials): Promise<EventDetails> {
  const { event, isAdmin, participants } = await request<EventDetails>(eventPath(slug), credentials);
  // A proxy can answer 200 with something else entirely, and the screens assume an event.
  if (!event) throw new ApiError('Unexpected response', 0);
  return { event, isAdmin: Boolean(isAdmin), participants: participants ?? [] };
}

export async function updateEvent(slug: string, adminKey: string, patch: EventPatch): Promise<void> {
  await request(eventPath(slug), { method: 'PATCH', adminKey, body: patch });
}

export async function deleteEvent(slug: string, adminKey: string): Promise<void> {
  await request(eventPath(slug), { method: 'DELETE', adminKey });
}

/**
 * `newKey` is the key the app wants, so that asking again after a lost answer gets the same result.
 * Resolves to the key that works now, which a server from before proposals picks itself.
 */
export async function rotateAdminKey(slug: string, adminKey: string, newKey: string): Promise<string> {
  const data = await request<{ adminKey?: unknown }>(`${eventPath(slug)}/admin-key`, { method: 'POST', adminKey, body: { newKey } });
  // Anything else stored as the key would lock the creator out, so it counts as no answer.
  if (!isAdminKeyFormat(data.adminKey)) throw new ApiError('Unexpected response', 0);
  return data.adminKey;
}

export async function saveParticipant(slug: string, input: SaveParticipantInput): Promise<Participant> {
  const data = await request<{ participant: Participant }>(`${eventPath(slug)}/participants`, { method: 'POST', body: input });
  return data.participant;
}

export async function deleteParticipant(slug: string, participantId: string, credentials: Credentials): Promise<void> {
  await request(`${eventPath(slug)}/participants?id=${encodeURIComponent(participantId)}`, { method: 'DELETE', ...credentials });
}

/** Splits long lists to fit the API's cap. One failed part fails the lot, so the caller can fall back. */
export async function lookupAdminEvents(items: { slug: string; adminKey: string }[]): Promise<AdminEventSummary[]> {
  const chunks: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += MAX_ADMIN_LOOKUP) chunks.push(items.slice(i, i + MAX_ADMIN_LOOKUP));

  const results = await Promise.all(
    chunks.map(chunk => request<{ events?: AdminEventSummary[] }>('/api/events/lookup', { method: 'POST', body: { items: chunk } })),
  );
  return results.flatMap(result => result.events ?? []);
}

/** A 4xx answer will be the same next time, and retrying a 429 only uses up more of the limit. */
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}
