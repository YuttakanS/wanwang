import { describe, expect, it } from 'vitest';
import { translate } from './strings';

describe('translate', () => {
  it('uses the website text when the app has none of its own', () => {
    expect(translate('th', 'retryBtn')).toBe('ลองใหม่');
    expect(translate('en', 'retryBtn')).toBe('Try again');
  });

  it('prefers the app text over the website text', () => {
    expect(translate('th', 'myEventsSubtitle')).toContain('เครื่องนี้');
    expect(translate('en', 'saveMyAvailabilityBtn')).not.toContain('ENTER');
  });

  it('fills every copy of a parameter, including text with regex characters', () => {
    expect(translate('en', 'myEventsHideLabel', { title: '$& (a)' })).toBe('Hide $& (a) from the list');
  });

  it('shows the key rather than nothing when text is missing', () => {
    expect(translate('th', 'noSuchKey')).toBe('noSuchKey');
  });

  it('uses the singular English text for a count of 1', () => {
    expect(translate('en', 'responsesBadge', { count: 1 })).toBe('1 response');
    expect(translate('en', 'responsesBadge', { count: 2 })).toBe('2 responses');
    expect(translate('en', 'responsesBadge', { count: 0 })).toBe('0 responses');
    expect(translate('th', 'responsesBadge', { count: 1 })).toBe('1 คำตอบ');
  });
});
