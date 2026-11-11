import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { supabase, shouldUseSupabase } from './supabaseClient';
import type { ValidFeedbackInput } from './validation';

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json');

/** Stores one feedback entry. Nothing identifying the sender is kept with it. */
export async function saveFeedback(input: ValidFeedbackInput): Promise<void> {
  if (shouldUseSupabase() && supabase) {
    const { error } = await supabase.from('feedback').insert({
      type: input.type,
      rating: input.rating,
      message: input.message,
    });
    if (error) {
      console.error('Supabase saveFeedback error:', error);
      throw new Error(error.message);
    }
    return;
  }

  // Dev fallback, same as events: ./data/*.json
  await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
  let entries: unknown[] = [];
  try {
    entries = JSON.parse(await fs.readFile(FEEDBACK_FILE, 'utf-8')) || [];
  } catch {
    // no file yet
  }
  entries.push({ id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() });
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}
