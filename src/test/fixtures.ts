import type { Participant, WanWangEvent } from '@/types';

export function makeEvent(overrides: Partial<WanWangEvent> = {}): WanWangEvent {
  return {
    id: 'event-1',
    slug: 'abc123',
    title: 'Team dinner',
    category: 'general',
    granularity: 'day',
    dateRangeStart: '2026-12-01',
    dateRangeEnd: '2026-12-03',
    dates: ['2026-12-01', '2026-12-02', '2026-12-03'],
    startTime: '09:00',
    endTime: '22:00',
    slotInterval: 60,
    adminKey: 'stored-admin-hash',
    isClosed: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'participant-1',
    eventId: 'event-1',
    name: 'Ann',
    note: '',
    editToken: 'stored-token-hash',
    availability: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}
