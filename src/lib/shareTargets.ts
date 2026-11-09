import type { Participant, WanWangEvent } from '@/types';
import type { Language } from './translations';
import { generateShareMessage } from './timeUtils';

export type ShareTarget = 'line' | 'whatsapp';

// A conservative cap, since these endpoints publish no limit. Encoded Thai takes 9 characters
// per letter, so a summary with many names can otherwise produce a link that fails to open.
const MAX_SHARE_URL_LENGTH = 2000;

const SHARE_URLS: Record<ShareTarget, (encodedText: string) => string> = {
  line: (text) => `https://line.me/R/msg/text/?${text}`,
  whatsapp: (text) => `https://wa.me/?text=${text}`,
};

export function buildShareUrl(
  target: ShareTarget,
  event: WanWangEvent,
  participants: Participant[],
  eventUrl: string,
  lang: Language
): string {
  const build = SHARE_URLS[target];
  const full = build(encodeURIComponent(generateShareMessage(event, participants, eventUrl, lang)));
  if (full.length <= MAX_SHARE_URL_LENGTH) return full;

  return build(encodeURIComponent(`${event.title}\n👉 ${eventUrl}`));
}
