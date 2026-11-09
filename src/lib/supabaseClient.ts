import { createClient } from '@supabase/supabase-js';

// SERVER ONLY. Uses the service-role key (never expose with NEXT_PUBLIC_).
// RLS denies the anon role entirely; all access goes through our API routes.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  serviceKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  !supabaseUrl.includes('example.com')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } })
  : null;

/** True = use Supabase. In production, missing config is a hard error (no file fallback). */
export function shouldUseSupabase(): boolean {
  if (isSupabaseConfigured) return true;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database is not configured');
  }
  return false;
}
