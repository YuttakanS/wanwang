import { describe, expect, it } from 'vitest';
import { buildHtml, formatSummary, parseEnv, summarize } from '../../scripts/owner-stats.mjs';

const stats = {
  generated_at: '2026-11-11T10:00:00Z',
  first_day: '2026-11-01',
  totals: { events_created: 4, responses: 10, files_attached: 3 },
  daily: [
    { day: '2026-11-01', metric: 'events_created', count: 1 },
    { day: '2026-11-01', metric: 'responses', count: 4 },
    { day: '2026-11-02', metric: 'events_created', count: 3 },
  ],
  stored_now: { events: 2, responses: 5, biggest_event: 4, events_with_responses: 2 },
  feedback: { count: 2, rated: 1, avg_rating: 4, by_type: { idea: 2 } },
};

const empty = {
  generated_at: '2026-11-11T10:00:00Z',
  first_day: null,
  totals: {},
  daily: [],
  stored_now: { events: 0, responses: 0, biggest_event: 0, events_with_responses: 0 },
  feedback: { count: 0, rated: 0, avg_rating: null, by_type: {} },
};

describe('parseEnv', () => {
  it('reads keys, skipping comments and blank lines, and strips quotes', () => {
    expect(parseEnv('# note\n\nSUPABASE_URL=https://x.supabase.co\r\nSUPABASE_SERVICE_ROLE_KEY="abc=def"\n bad line\n')).toEqual({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'abc=def',
    });
  });
});

describe('summarize', () => {
  it('fills in metrics with no activity as zero and works out responses per event', () => {
    const s = summarize(stats);

    expect(s.totals).toMatchObject({ events_created: 4, responses: 10, files_attached: 3, events_with_limit: 0 });
    expect(s.responsesPerEvent).toBe(2.5);
    expect(s.days).toBe(2);
  });

  it('has no average when no event was ever created', () => {
    expect(summarize(empty).responsesPerEvent).toBeNull();
  });
});

describe('formatSummary', () => {
  it('prints the totals', () => {
    const text = formatSummary(stats);

    expect(text).toMatch(/นัดที่สร้าง\s+4\n/);
    expect(text).toMatch(/คนลงเวลาเฉลี่ยต่อนัด\s+2\.5/);
    expect(text).toMatch(/4\.00 จาก 1 คน/);
  });

  it('copes with a database that has nothing yet', () => {
    const text = formatSummary(empty);

    expect(text).toContain('ยังไม่มีข้อมูล');
    expect(text).toMatch(/คะแนนเฉลี่ย \(เต็ม 5\)\s+-/);
  });
});

describe('buildHtml', () => {
  it('embeds the numbers and loads nothing from elsewhere', () => {
    const html = buildHtml(stats);

    expect(html).toContain('"events_created":4');
    expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:/);
  });

  it('cannot be broken out of by a value containing a closing script tag', () => {
    const html = buildHtml({ ...stats, feedback: { ...stats.feedback, by_type: { '</script><script>alert(1)</script>': 1 } } });

    expect(html).not.toContain('</script><script>alert(1)');
    expect(html.match(/<\/script>/g)).toHaveLength(2);
  });
});
