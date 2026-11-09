import { describe, expect, it } from 'vitest';
import { translate, type Translate } from '~/constants/strings';
import { ApiError } from './api';
import { errorMessage } from './errorMessage';

const t: Translate = (key, params) => translate('en', key, params);

describe('errorMessage', () => {
  it('shows how long to wait after a 429', () => {
    expect(errorMessage(new ApiError('x', 429, 30), t)).toContain('30 sec');
    expect(errorMessage(new ApiError('x', 429, 3600), t)).toContain('60 min');
    expect(errorMessage(new ApiError('x', 429, 61), t)).toContain('2 min');
    expect(errorMessage(new ApiError('x', 429), t)).toBe(t('rateLimitedSoon'));
  });

  it('shows the server text only for a 400', () => {
    expect(errorMessage(new ApiError('title is required', 400), t)).toBe('title is required');
    expect(errorMessage(new ApiError('Failed to fetch event', 500), t)).toBe(t('errorDesc'));
  });

  it('explains network failures and other known states', () => {
    expect(errorMessage(new ApiError('x', 0), t)).toBe(t('networkError'));
    expect(errorMessage(new ApiError('x', 403), t)).toBe(t('forbiddenError'));
    expect(errorMessage(new ApiError('x', 404), t)).toBe(t('notFoundDesc'));
  });

  it('never shows the text of an unexpected error', () => {
    expect(errorMessage(new Error('secret detail'), t)).toBe(t('errorDesc'));
  });
});
