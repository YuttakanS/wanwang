import type { Translate } from '~/constants/strings';
import { ApiError } from './api';

function waitText(seconds: number, t: Translate): string {
  return seconds >= 60 ? t('minutesUnit', { count: Math.ceil(seconds / 60) }) : t('secondsUnit', { count: seconds });
}

/** Only a 400 explains itself to the person using the app. Other server text is for developers. */
export function errorMessage(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) return t('errorDesc');
  switch (error.status) {
    case 0:
      return t('networkError');
    case 400:
      return error.message;
    case 403:
      return t('forbiddenError');
    case 409:
      // A server from before the codes sends none, and only a full event answered 409 then.
      return error.code === 'SLOT_FULL' ? t('errorSlotFull') : t('eventFullError');
    case 404:
      return t('notFoundDesc');
    case 429:
      return error.retryAfterSeconds ? t('rateLimited', { time: waitText(error.retryAfterSeconds, t) }) : t('rateLimitedSoon');
    default:
      return t('errorDesc');
  }
}
