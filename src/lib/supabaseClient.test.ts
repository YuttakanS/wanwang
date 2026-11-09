import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadClient(env: { url?: string; key?: string; nodeEnv: string }) {
  vi.resetModules();
  vi.stubEnv('SUPABASE_URL', env.url ?? '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', env.key ?? '');
  vi.stubEnv('NODE_ENV', env.nodeEnv);
  return import('./supabaseClient');
}

describe('shouldUseSupabase', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses to run in production without a database', async () => {
    const { shouldUseSupabase } = await loadClient({ nodeEnv: 'production' });
    expect(() => shouldUseSupabase()).toThrow('Database is not configured');
  });

  it('treats placeholder values as missing', async () => {
    for (const url of ['your_supabase_project_url', 'https://x.example.com']) {
      const { shouldUseSupabase } = await loadClient({ url, key: 'key', nodeEnv: 'production' });
      expect(() => shouldUseSupabase()).toThrow('Database is not configured');
    }
  });

  it('requires the service key as well as the URL', async () => {
    const { shouldUseSupabase } = await loadClient({ url: 'https://db.supabase.test', nodeEnv: 'production' });
    expect(() => shouldUseSupabase()).toThrow('Database is not configured');
  });

  it('uses the file fallback only outside production', async () => {
    const { shouldUseSupabase, supabase } = await loadClient({ nodeEnv: 'development' });
    expect(shouldUseSupabase()).toBe(false);
    expect(supabase).toBeNull();
  });

  it('uses Supabase when configured', async () => {
    const { shouldUseSupabase, supabase } = await loadClient({
      url: 'https://db.supabase.test',
      key: 'key',
      nodeEnv: 'production',
    });
    expect(shouldUseSupabase()).toBe(true);
    expect(supabase).not.toBeNull();
  });
});
