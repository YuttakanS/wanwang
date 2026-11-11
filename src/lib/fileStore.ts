import crypto from 'crypto';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { Answers, isFileAnswer } from '@/types';

// SERVER ONLY. Files that respondents attach to a question live in a private Supabase Storage
// bucket (created in supabase/schema.sql). Browsers never get a storage key: they upload through a
// short-lived signed URL issued here, and the creator downloads through another one.
// Layout: "<event id>/<file id>[.ext]". The original file name is kept in the answer, not the path.

export const FILE_BUCKET = 'event-files';

/** Per event, so one shared link cannot fill the whole project's storage. */
export const EVENT_FILE_QUOTA = { files: 200, bytes: 500 * 1024 * 1024 } as const;

const DOWNLOAD_URL_SECONDS = 60;
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 1000;

/** Thrown when there is no Supabase project, as in local dev on ./data/*.json. */
export class FileStoreUnavailable extends Error {
  constructor() {
    super('File uploads need Supabase Storage');
  }
}

function bucket() {
  if (!isSupabaseConfigured || !supabase) throw new FileStoreUnavailable();
  return supabase.storage.from(FILE_BUCKET);
}

function extensionOf(fileName: string): string {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName);
  return match ? `.${match[1].toLowerCase()}` : '';
}

interface StoredFile {
  path: string;
  size: number;
  createdAt: number;
}

async function listEventFiles(eventId: string): Promise<StoredFile[]> {
  const { data, error } = await bucket().list(eventId, { limit: LIST_LIMIT });
  if (error) throw new Error(error.message);
  return (data || [])
    .filter(f => f.id) // folders have no id
    .map(f => ({
      path: `${eventId}/${f.name}`,
      size: Number(f.metadata?.size ?? 0),
      createdAt: Date.parse(f.created_at ?? '') || 0,
    }));
}

/** A place to upload one file to. The bucket's own size limit applies to whatever is sent. */
export async function createUpload(eventId: string, fileName: string): Promise<{ path: string; uploadUrl: string }> {
  const path = `${eventId}/${crypto.randomUUID()}${extensionOf(fileName)}`;
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || 'Could not create upload URL');
  return { path, uploadUrl: data.signedUrl };
}

export async function eventFileUsage(eventId: string): Promise<{ files: number; bytes: number }> {
  const files = await listEventFiles(eventId);
  return { files: files.length, bytes: files.reduce((sum, f) => sum + f.size, 0) };
}

/** The stored size, or null when nothing was uploaded to this path. */
export async function storedFileSize(path: string): Promise<number | null> {
  const [eventId] = path.split('/');
  const found = (await listEventFiles(eventId)).find(f => f.path === path);
  return found ? found.size : null;
}

/** A link that downloads the file under its original name. It stops working after a minute. */
export async function createDownloadUrl(path: string, fileName: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(path, DOWNLOAD_URL_SECONDS, { download: fileName });
  if (error || !data) throw new Error(error?.message || 'Could not create download URL');
  return data.signedUrl;
}

export function filePathsIn(answers: Answers | undefined): string[] {
  return Object.values(answers ?? {}).filter(isFileAnswer).map(f => f.path);
}

/**
 * Best effort: the row that pointed at these files is already gone, so a failure here must not
 * fail the request. The daily sweep removes whatever is left behind.
 */
export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0 || !isSupabaseConfigured) return;
  try {
    const { error } = await bucket().remove(paths);
    if (error) console.error('Remove files error:', error);
  } catch (err) {
    console.error('Remove files error:', err);
  }
}

export async function removeEventFiles(eventId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const files = await listEventFiles(eventId);
    await removeFiles(files.map(f => f.path));
  } catch (err) {
    console.error('Remove event files error:', err);
  }
}

/**
 * Deletes files nothing points at: those of events that no longer exist (purge_expired_events()
 * deletes rows only, it cannot reach storage) and uploads that were never submitted with an answer.
 */
export async function sweepOrphanFiles(now = Date.now()): Promise<{ removed: number }> {
  if (!isSupabaseConfigured || !supabase) throw new FileStoreUnavailable();

  const { data: folders, error } = await bucket().list('', { limit: LIST_LIMIT });
  if (error) throw new Error(error.message);
  const eventIds = (folders || []).filter(f => !f.id).map(f => f.name);
  if (eventIds.length === 0) return { removed: 0 };

  const { data: events, error: eventsError } = await supabase.from('events').select('id').in('id', eventIds);
  if (eventsError) throw new Error(eventsError.message);
  const live = new Set((events || []).map(e => e.id as string));

  let removed = 0;
  for (const eventId of eventIds) {
    const files = await listEventFiles(eventId);
    let orphans = files;

    if (live.has(eventId)) {
      const { data: rows, error: rowsError } = await supabase
        .from('participants')
        .select('answers')
        .eq('event_id', eventId);
      if (rowsError) throw new Error(rowsError.message);
      const used = new Set((rows || []).flatMap(r => filePathsIn(r.answers as Answers)));
      // A fresh upload may belong to a form that is still being filled in.
      orphans = files.filter(f => !used.has(f.path) && now - f.createdAt > ORPHAN_AGE_MS);
    }

    if (orphans.length > 0) {
      const { error: removeError } = await bucket().remove(orphans.map(f => f.path));
      if (removeError) throw new Error(removeError.message);
      removed += orphans.length;
    }
  }
  return { removed };
}
