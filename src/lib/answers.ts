// Shared by the website and the app, so it must not import React or Node modules.
import type { Answers, EventQuestion } from '@/types';

/** The first required question left unanswered, or null. */
export function firstUnanswered(questions: EventQuestion[], answers: Answers): EventQuestion | null {
  return (
    questions.find(q => {
      if (!q.required) return false;
      const a = answers[q.id];
      if (a === undefined) return true;
      if (typeof a === 'string') return a.trim() === '';
      if (Array.isArray(a)) return a.length === 0;
      return false;
    }) ?? null
  );
}

/**
 * The answers as they should be sent: text trimmed, blanks dropped, and nothing kept for a
 * question the event no longer asks or for an option it no longer offers.
 */
export function answersToSend(questions: EventQuestion[], answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined) continue;
    if (q.type === 'text') {
      if (typeof a === 'string' && a.trim()) out[q.id] = a.trim();
    } else if (q.type === 'choice') {
      if (typeof a === 'string' && q.options?.includes(a)) out[q.id] = a;
    } else if (q.type === 'multi') {
      const kept = Array.isArray(a) ? a.filter(o => q.options?.includes(o)) : [];
      if (kept.length > 0) out[q.id] = kept;
    } else if (typeof a === 'object' && !Array.isArray(a)) {
      out[q.id] = a;
    }
  }
  return out;
}
