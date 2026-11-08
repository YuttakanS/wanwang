import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { WanWangEvent, Participant, AdminEventSummary } from '@/types';
import { supabase, useSupabase } from './supabaseClient';
import { hashAdminKey, safeEqual, verifyAdminKey } from './validation';
import { generateDatesInRange, formatDateToISO } from './timeUtils';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

async function ensureDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(EVENTS_FILE);
    } catch {
      await fs.writeFile(EVENTS_FILE, '[]', 'utf-8');
    }
    try {
      await fs.access(PARTICIPANTS_FILE);
    } catch {
      await fs.writeFile(PARTICIPANTS_FILE, '[]', 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring data files:', err);
  }
}

async function readLocalEvents(): Promise<WanWangEvent[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

async function writeLocalEvents(events: WanWangEvent[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

async function readLocalParticipants(): Promise<Participant[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(PARTICIPANTS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

async function writeLocalParticipants(participants: Participant[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2), 'utf-8');
}

/**
 * Only the hash of an admin key is stored. getEventBySlug returns that hash as
 * adminKey; functions that were handed the plaintext key return it unchanged.
 */
export async function createEvent(
  params: Omit<WanWangEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WanWangEvent> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Determine dateRangeStart and dateRangeEnd
  const today = formatDateToISO(new Date());
  const defaultEndDateObj = new Date();
  defaultEndDateObj.setDate(defaultEndDateObj.getDate() + 30);
  const defaultEndDate = formatDateToISO(defaultEndDateObj);

  let start = params.dateRangeStart;
  let end = params.dateRangeEnd;

  if (!start && !end && params.dates && params.dates.length > 0) {
    const sorted = [...params.dates].sort();
    start = sorted[0];
    end = sorted[sorted.length - 1];
  }

  const dateRangeStart = start || today;
  const dateRangeEnd = end || defaultEndDate;
  const dates = generateDatesInRange(dateRangeStart, dateRangeEnd);

  const newEvent: WanWangEvent = {
    ...params,
    id,
    adminKey: hashAdminKey(params.adminKey),
    dateRangeStart,
    dateRangeEnd,
    durationDays: params.durationDays || 1,
    confirmedDate: params.confirmedDate,
    dates,
    granularity: params.granularity || 'day',
    startTime: params.startTime || '09:00',
    endTime: params.endTime || '22:00',
    slotInterval: params.slotInterval || 60,
    createdAt: now,
    updatedAt: now,
  };

  if (useSupabase() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        id: newEvent.id,
        slug: newEvent.slug,
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        category: newEvent.category,
        granularity: newEvent.granularity,
        dates: newEvent.dates,
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        slot_interval: newEvent.slotInterval,
        admin_key: newEvent.adminKey,
        is_closed: newEvent.isClosed,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase createEvent error:', error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      location: data.location,
      category: data.category,
      granularity: data.granularity || newEvent.granularity,
      dateRangeStart: newEvent.dateRangeStart,
      dateRangeEnd: newEvent.dateRangeEnd,
      durationDays: newEvent.durationDays,
      confirmedDate: newEvent.confirmedDate,
      dates: data.dates || newEvent.dates,
      startTime: data.start_time || '09:00',
      endTime: data.end_time || '22:00',
      slotInterval: data.slot_interval || 60,
      adminKey: params.adminKey,
      isClosed: data.is_closed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const events = await readLocalEvents();
  events.push(newEvent);
  await writeLocalEvents(events);
  return { ...newEvent, adminKey: params.adminKey };
}

export async function getEventBySlug(slug: string): Promise<WanWangEvent | null> {
  if (useSupabase() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Supabase getEventBySlug error:', error);
      return null;
    }

    if (!data) return null;

    const dates = data.dates || [];
    const dateRangeStart = dates.length > 0 ? dates[0] : formatDateToISO(new Date());
    const dateRangeEnd = dates.length > 0 ? dates[dates.length - 1] : dateRangeStart;

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      location: data.location,
      category: data.category,
      granularity: data.granularity || 'day',
      dateRangeStart,
      dateRangeEnd,
      durationDays: 1,
      confirmedDate: data.confirmed_date || undefined,
      dates: dates.length > 0 ? dates : generateDatesInRange(dateRangeStart, dateRangeEnd),
      startTime: data.start_time || '09:00',
      endTime: data.end_time || '22:00',
      slotInterval: data.slot_interval || 60,
      adminKey: data.admin_key,
      isClosed: data.is_closed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const events = await readLocalEvents();
  const found = events.find(e => e.slug === slug || e.id === slug);
  if (!found) return null;

  const dateRangeStart = found.dateRangeStart || (found.dates && found.dates.length > 0 ? found.dates[0] : formatDateToISO(new Date()));
  const dateRangeEnd = found.dateRangeEnd || (found.dates && found.dates.length > 0 ? found.dates[found.dates.length - 1] : dateRangeStart);
  const dates = found.dates && found.dates.length > 0 ? found.dates : generateDatesInRange(dateRangeStart, dateRangeEnd);

  return {
    ...found,
    dateRangeStart,
    dateRangeEnd,
    durationDays: found.durationDays || 1,
    dates,
    granularity: found.granularity || 'day',
  };
}

export async function updateEvent(
  slug: string,
  adminKey: string,
  updates: Partial<WanWangEvent>
): Promise<WanWangEvent | null> {
  const now = new Date().toISOString();

  if (useSupabase() && supabase) {
    const { data: existing } = await supabase
      .from('events')
      .select('id, admin_key, granularity, dates')
      .eq('slug', slug)
      .single();

    if (!existing || !verifyAdminKey(adminKey, existing.admin_key)) {
      throw new Error('UNAUTHORIZED');
    }

    if (updates.granularity !== undefined && updates.granularity !== existing.granularity) {
      const participants = await getParticipantsByEventId(existing.id);
      if (participants.length > 0) {
        throw new Error('CANNOT_CHANGE_GRANULARITY_WITH_VOTES');
      }
    }

    const payload: Record<string, unknown> = { updated_at: now };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.granularity !== undefined) payload.granularity = updates.granularity;
    if (updates.isClosed !== undefined) payload.is_closed = updates.isClosed;
    if (updates.confirmedDate !== undefined) payload.confirmed_date = updates.confirmedDate || null;

    if (updates.dateRangeStart && updates.dateRangeEnd) {
      const oldDates: string[] = existing.dates || [];
      if (oldDates.length > 0) {
        const participants = await getParticipantsByEventId(existing.id);
        if (
          participants.length > 0 &&
          (updates.dateRangeStart > oldDates[0] || updates.dateRangeEnd < oldDates[oldDates.length - 1])
        ) {
          throw new Error('CANNOT_SHRINK_RANGE_WITH_VOTES');
        }
      }
      payload.dates = generateDatesInRange(updates.dateRangeStart, updates.dateRangeEnd);
    }

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('slug', slug)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const dates = data.dates || [];
    const dateRangeStart = dates.length > 0 ? dates[0] : formatDateToISO(new Date());
    const dateRangeEnd = dates.length > 0 ? dates[dates.length - 1] : dateRangeStart;

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      location: data.location,
      category: data.category,
      granularity: data.granularity || 'day',
      dateRangeStart,
      dateRangeEnd,
      durationDays: 1,
      confirmedDate: data.confirmed_date || undefined,
      dates,
      startTime: data.start_time || '09:00',
      endTime: data.end_time || '22:00',
      slotInterval: data.slot_interval || 60,
      adminKey,
      isClosed: data.is_closed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const events = await readLocalEvents();
  const index = events.findIndex(e => (e.slug === slug || e.id === slug) && verifyAdminKey(adminKey, e.adminKey));
  if (index === -1) return null;

  const existingEvent = events[index];

  if (updates.granularity !== undefined && updates.granularity !== (existingEvent.granularity || 'day')) {
    const participants = await getParticipantsByEventId(existingEvent.id);
    if (participants.length > 0) {
      throw new Error('CANNOT_CHANGE_GRANULARITY_WITH_VOTES');
    }
  }

  // Check date range shrink when participants exist
  if (updates.dateRangeStart !== undefined || updates.dateRangeEnd !== undefined) {
    const participants = await getParticipantsByEventId(existingEvent.id);
    if (participants.length > 0) {
      if (updates.dateRangeStart && existingEvent.dateRangeStart && updates.dateRangeStart > existingEvent.dateRangeStart) {
        throw new Error('CANNOT_SHRINK_RANGE_WITH_VOTES');
      }
      if (updates.dateRangeEnd && existingEvent.dateRangeEnd && updates.dateRangeEnd < existingEvent.dateRangeEnd) {
        throw new Error('CANNOT_SHRINK_RANGE_WITH_VOTES');
      }
    }
  }

  const newStart = updates.dateRangeStart || existingEvent.dateRangeStart || (existingEvent.dates?.[0] ?? formatDateToISO(new Date()));
  const newEnd = updates.dateRangeEnd || existingEvent.dateRangeEnd || (existingEvent.dates?.[existingEvent.dates.length - 1] ?? newStart);
  const newDates = (updates.dateRangeStart || updates.dateRangeEnd)
    ? generateDatesInRange(newStart, newEnd)
    : (updates.dates || existingEvent.dates);

  events[index] = {
    ...existingEvent,
    ...(updates.title !== undefined && { title: updates.title }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.location !== undefined && { location: updates.location }),
    ...(updates.category !== undefined && { category: updates.category }),
    ...(updates.isClosed !== undefined && { isClosed: updates.isClosed }),
    dateRangeStart: newStart,
    dateRangeEnd: newEnd,
    dates: newDates,
    granularity: updates.granularity !== undefined ? updates.granularity : (existingEvent.granularity || 'day'),
    confirmedDate: updates.confirmedDate !== undefined ? (updates.confirmedDate || undefined) : existingEvent.confirmedDate,
    updatedAt: now,
  };
  await writeLocalEvents(events);
  return { ...events[index], adminKey };
}

export async function getParticipantsByEventId(eventId: string): Promise<Participant[]> {
  if (useSupabase() && supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase getParticipants error:', error);
      return [];
    }

    return (data || []).map(p => ({
      id: p.id,
      eventId: p.event_id,
      name: p.name,
      note: p.note,
      editToken: p.edit_token,
      availability: p.availability || p.available_dates || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  const all = await readLocalParticipants();
  return all.filter(p => p.eventId === eventId);
}

export async function upsertParticipant(
  eventId: string,
  data: {
    id?: string;
    name: string;
    note?: string;
    editToken?: string;
    availability: string[];
  }
): Promise<Participant> {
  const now = new Date().toISOString();

  if (useSupabase() && supabase) {
    if (data.id) {
      if (!data.editToken) throw new Error('FORBIDDEN');
      const { data: updated, error } = await supabase
        .from('participants')
        .update({
          name: data.name,
          note: data.note,
          availability: data.availability,
          updated_at: now,
        })
        .eq('id', data.id)
        .eq('event_id', eventId)
        .eq('edit_token', data.editToken)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!updated) throw new Error('FORBIDDEN');

      return {
        id: updated.id,
        eventId: updated.event_id,
        name: updated.name,
        note: updated.note,
        editToken: updated.edit_token,
        availability: updated.availability,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    } else {
      const editToken = crypto.randomBytes(16).toString('hex');
      const { data: inserted, error } = await supabase
        .from('participants')
        .insert({
          event_id: eventId,
          name: data.name,
          note: data.note,
          edit_token: editToken,
          availability: data.availability,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: inserted.id,
        eventId: inserted.event_id,
        name: inserted.name,
        note: inserted.note,
        editToken: inserted.edit_token,
        availability: inserted.availability,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
    }
  }

  const participants = await readLocalParticipants();
  if (data.id) {
    const idx = participants.findIndex(
      p => p.id === data.id && p.eventId === eventId && safeEqual(p.editToken, data.editToken)
    );
    if (idx === -1) throw new Error('FORBIDDEN');
    participants[idx] = {
      ...participants[idx],
      name: data.name,
      note: data.note,
      availability: data.availability,
      updatedAt: now,
    };
    await writeLocalParticipants(participants);
    return participants[idx];
  }

  const newParticipant: Participant = {
    id: crypto.randomUUID(),
    eventId,
    name: data.name,
    note: data.note,
    editToken: crypto.randomBytes(16).toString('hex'),
    availability: data.availability,
    createdAt: now,
    updatedAt: now,
  };

  participants.push(newParticipant);
  await writeLocalParticipants(participants);
  return newParticipant;
}

export async function deleteParticipant(
  eventId: string,
  participantId: string,
  auth: { asAdmin: boolean; editToken?: string }
): Promise<boolean> {
  if (!auth.asAdmin && !auth.editToken) return false;

  if (useSupabase() && supabase) {
    let query = supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('event_id', eventId);
    if (!auth.asAdmin) {
      query = query.eq('edit_token', auth.editToken!);
    }
    const { data, error } = await query.select('id');
    return !error && (data?.length ?? 0) > 0;
  }

  const participants = await readLocalParticipants();
  const filtered = participants.filter(
    p =>
      !(
        p.id === participantId &&
        p.eventId === eventId &&
        (auth.asAdmin || safeEqual(p.editToken, auth.editToken))
      )
  );
  if (filtered.length !== participants.length) {
    await writeLocalParticipants(filtered);
    return true;
  }
  return false;
}

/** Replaces the admin key, invalidating the old key and every link built from it. */
export async function rotateAdminKey(slug: string, currentKey: string): Promise<string | null> {
  const newKey = crypto.randomBytes(16).toString('hex');
  const newHash = hashAdminKey(newKey);
  const now = new Date().toISOString();

  if (useSupabase() && supabase) {
    const { data: existing } = await supabase
      .from('events')
      .select('id, admin_key')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing || !verifyAdminKey(currentKey, existing.admin_key)) return null;

    // Matching the old key too means two simultaneous rotations cannot both win.
    const { data, error } = await supabase
      .from('events')
      .update({ admin_key: newHash, updated_at: now })
      .eq('id', existing.id)
      .eq('admin_key', existing.admin_key)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? newKey : null;
  }

  const events = await readLocalEvents();
  const index = events.findIndex(e => e.slug === slug && verifyAdminKey(currentKey, e.adminKey));
  if (index === -1) return null;
  events[index] = { ...events[index], adminKey: newHash, updatedAt: now };
  await writeLocalEvents(events);
  return newKey;
}

/** Summaries for the events whose key matches; others are silently left out. */
export async function getAdminEventSummaries(
  items: { slug: string; adminKey: string }[]
): Promise<AdminEventSummary[]> {
  if (items.length === 0) return [];
  const keyBySlug = new Map(items.map(i => [i.slug, i.adminKey]));

  if (useSupabase() && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('slug, title, is_closed, created_at, admin_key, participants(count)')
      .in('slug', [...keyBySlug.keys()]);
    if (error) throw new Error(error.message);

    return (data || [])
      .filter(e => verifyAdminKey(keyBySlug.get(e.slug), e.admin_key))
      .map(e => ({
        slug: e.slug,
        title: e.title,
        isClosed: e.is_closed,
        createdAt: e.created_at,
        participantCount: (e.participants as unknown as { count: number }[])?.[0]?.count ?? 0,
      }));
  }

  const [events, participants] = await Promise.all([readLocalEvents(), readLocalParticipants()]);
  return events
    .filter(e => verifyAdminKey(keyBySlug.get(e.slug), e.adminKey))
    .map(e => ({
      slug: e.slug,
      title: e.title,
      isClosed: e.isClosed,
      createdAt: e.createdAt,
      participantCount: participants.filter(p => p.eventId === e.id).length,
    }));
}

export async function deleteEvent(slug: string, adminKey: string): Promise<boolean> {
  if (useSupabase() && supabase) {
    const { data: existing } = await supabase
      .from('events')
      .select('id, admin_key')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing || !verifyAdminKey(adminKey, existing.admin_key)) return false;
    const { error } = await supabase.from('events').delete().eq('id', existing.id);
    return !error;
  }

  const events = await readLocalEvents();
  const found = events.find(e => e.slug === slug && verifyAdminKey(adminKey, e.adminKey));
  if (!found) return false;
  await writeLocalEvents(events.filter(e => e.id !== found.id));
  const participants = await readLocalParticipants();
  await writeLocalParticipants(participants.filter(p => p.eventId !== found.id));
  return true;
}
