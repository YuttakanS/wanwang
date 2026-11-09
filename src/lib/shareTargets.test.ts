import { describe, expect, it } from 'vitest';
import { makeEvent } from '@/test/fixtures';
import { LIMITS } from './validation';
import { buildShareUrl } from './shareTargets';

const URL = 'https://example.test/e/abc123';
const decodeText = (shareUrl: string, prefix: string) =>
  decodeURIComponent(shareUrl.slice(prefix.length));

describe.each([
  ['line', 'https://line.me/R/msg/text/?'],
  ['whatsapp', 'https://wa.me/?text='],
] as const)('buildShareUrl for %s', (target, prefix) => {
  it('sends the full summary when it fits', () => {
    const shareUrl = buildShareUrl(target, makeEvent({ description: 'Bring snacks' }), [], URL, 'en');
    expect(shareUrl.startsWith(prefix)).toBe(true);
    const text = decodeText(shareUrl, prefix);
    expect(text).toContain('Bring snacks');
    expect(text).toContain(URL);
  });

  it('falls back to the title and link when the summary is too long', () => {
    const event = makeEvent({ description: 'ก'.repeat(LIMITS.description) });
    const shareUrl = buildShareUrl(target, event, [], URL, 'th');
    expect(shareUrl.length).toBeLessThanOrEqual(2000);
    const text = decodeText(shareUrl, prefix);
    expect(text).toContain('Team dinner');
    expect(text).toContain(URL);
    expect(text).not.toContain('ก');
  });

  it('stays under the cap with the longest allowed title', () => {
    const event = makeEvent({
      title: 'ก'.repeat(LIMITS.title),
      description: 'ก'.repeat(LIMITS.description),
    });
    expect(buildShareUrl(target, event, [], URL, 'th').length).toBeLessThanOrEqual(2000);
  });
});
