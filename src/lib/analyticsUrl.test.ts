import { describe, expect, it } from 'vitest';
import { scrubAnalyticsUrl } from './analyticsUrl';

describe('scrubAnalyticsUrl', () => {
  it('hides the slug of an event page', () => {
    expect(scrubAnalyticsUrl('https://wanwang.example/e/abc123')).toBe('https://wanwang.example/e/[slug]');
  });

  it('drops the admin key in the fragment', () => {
    expect(scrubAnalyticsUrl('https://wanwang.example/e/abc123#admin=0123456789abcdef')).toBe(
      'https://wanwang.example/e/[slug]'
    );
  });

  it('drops the query string', () => {
    expect(scrubAnalyticsUrl('https://wanwang.example/e/abc123?x=1#admin=k')).toBe('https://wanwang.example/e/[slug]');
  });

  it('leaves other pages alone', () => {
    expect(scrubAnalyticsUrl('https://wanwang.example/privacy')).toBe('https://wanwang.example/privacy');
    expect(scrubAnalyticsUrl('https://wanwang.example/')).toBe('https://wanwang.example/');
  });
});
