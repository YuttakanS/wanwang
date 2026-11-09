import type { AdminEventSummary, Participant, TimeGranularity, EventCategory, WanWangEvent } from '@/types';
import { MAX_ADMIN_LOOKUP } from '@/types';
import { apiUrl } from '~/constants/config';

const TIMEOUT_MS = 20_000;

/** status 0 means the request never got an answer: no network, or a timeout. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, parseRetryAfter(response.headers.get('Retry-After')));
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
}

export type EventPatch = Partial<Pick<WanWangEvent, 'isClosed' | 'confirmedDate'>>;

export async function createEvent(input: CreateEventInput): Promise<{ event: WanWangEvent; adminKey: string }> {
  return request('/api/events', { method: 'POST', body: input });
}

export async function fetchEvent(slug: string, credentials: Credentials): Promise<EventDetails> {
  const { event, isAdmin, participants } = await request<EventDetails>(eventPath(slug), credentials);
  return { event, isAdmin: Boolean(isAdmin), participants: participants ?? [] };
}

export async function updateEvent(slug: string, adminKey: string, patch: EventPatch): Promise<void> {
  await request(eventPath(slug), { method: 'PATCH', adminKey, body: patch });
}

export async function deleteEvent(slug: string, adminKey: string): Promise<void> {
  await request(eventPath(slug), { method: 'DELETE', adminKey });
}

export async function rotateAdminKey(slug: string, adminKey: string): Promise<string> {
  const data = await request<{ adminKey: string }>(`${eventPath(slug)}/admin-key`, { method: 'POST', adminKey });
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
