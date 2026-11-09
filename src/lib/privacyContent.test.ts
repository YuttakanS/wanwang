import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIVACY_CONTENT } from './privacyContent';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf-8');

function retentionDaysInSchema(): number {
  const match = read('supabase/schema.sql').match(/CURRENT_DATE\s*-\s*(\d+)/);
  if (!match) throw new Error('Retention period not found in schema.sql');
  return Number(match[1]);
}

// The notice is a promise to users, so it must state what the database job really does.
describe('retention period', () => {
  const days = retentionDaysInSchema();

  it('is the same in the Thai notice', () => {
    expect(JSON.stringify(PRIVACY_CONTENT.th)).toContain(`${days} วันหลังวันสุดท้ายของนัด`);
  });

  it('is the same in the English notice', () => {
    expect(JSON.stringify(PRIVACY_CONTENT.en)).toContain(`${days} days after its last date`);
  });

  it('is the same in both notes on the create form', () => {
    const notes = read('src/lib/translations.ts').match(/createVisibilityNote: '.*'/g) ?? [];
    expect(notes).toHaveLength(2);
    for (const note of notes) expect(note).toContain(String(days));
  });
});

// The app stores secrets differently from a browser, and the notice has to say so.
describe('the mobile app', () => {
  it('is described in both languages', () => {
    expect(JSON.stringify(PRIVACY_CONTENT.th)).toContain('Keychain หรือ Keystore');
    expect(JSON.stringify(PRIVACY_CONTENT.en)).toContain('Keychain or Keystore');
  });
});
