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

// What Vercel Web Analytics stores with each page view, from https://vercel.com/docs/analytics/privacy-policy:
// timestamp, URL, referrer, geolocation down to the city, device type, OS and browser with versions.
describe('the page view counting', () => {
  const th = JSON.stringify(PRIVACY_CONTENT.th);
  const en = JSON.stringify(PRIVACY_CONTENT.en);

  it('is named in both languages', () => {
    expect(th).toContain('Vercel Web Analytics');
    expect(en).toContain('Vercel Web Analytics');
  });

  it('does not understate the location or the device details that are recorded', () => {
    for (const word of ['ประเทศ', 'ภูมิภาค', 'เมือง', 'ระบบปฏิบัติการ', 'เลขรุ่น']) expect(th).toContain(word);
    for (const word of ['country', 'region', 'city', 'operating system', 'versions']) expect(en).toContain(word);
  });

  it('promises that an event cannot be told from the statistics, which the code has to keep', async () => {
    expect(th).toContain('ลิงก์ของนัดถูกตัดออกก่อนส่ง');
    expect(en).toContain('link is removed before anything is sent');

    // The address sent with a page view is scrubbed by the component...
    expect(read('src/components/WebAnalytics.tsx')).toContain('scrubAnalyticsUrl(event.url)');

    // ...and the browser is told never to send more than the origin as a referrer, which the counter's
    // own request would otherwise carry. On every page: one reached by a click inside the site keeps
    // the policy of the page that was loaded first, so a rule for event pages alone would not do.
    const { default: nextConfig } = await import('../../next.config');
    const rules = await nextConfig.headers!();
    const policies = rules.flatMap(rule => rule.headers.filter(header => header.key === 'Referrer-Policy').map(header => [rule.source, header.value]));
    expect(policies).toEqual([['/:path*', 'strict-origin']]);
  });
});

// The app stores secrets differently from a browser, and the notice has to say so.
describe('the mobile app', () => {
  it('is described in both languages', () => {
    expect(JSON.stringify(PRIVACY_CONTENT.th)).toContain('Keychain หรือ Keystore');
    expect(JSON.stringify(PRIVACY_CONTENT.en)).toContain('Keychain or Keystore');
  });
});
