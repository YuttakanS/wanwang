import type { EventQuestion, Participant } from '@/types';

/** Question id -> the option to show. NO_ANSWER shows people who left that question blank. */
export type RosterFilter = Record<string, string>;

export const NO_ANSWER = '';

/** Only questions with fixed options can be filtered on: free text and files have no shared values. */
export function filterableQuestions(questions: EventQuestion[]): EventQuestion[] {
  return questions.filter(q => (q.type === 'choice' || q.type === 'multi') && (q.options?.length ?? 0) > 0);
}

function picked(p: Participant, questionId: string): string[] {
  const a = p.answers?.[questionId];
  if (typeof a === 'string') return [a];
  return Array.isArray(a) ? a : [];
}

/** Drops choices that no longer exist, as after the creator removes a question or an option. */
export function activeFilter(filter: RosterFilter, questions: EventQuestion[]): RosterFilter {
  const out: RosterFilter = {};
  for (const q of filterableQuestions(questions)) {
    const want = filter[q.id];
    if (want !== undefined && (want === NO_ANSWER || q.options!.includes(want))) out[q.id] = want;
  }
  return out;
}

/** A person is shown when they match every question that has a choice set. */
export function matchesFilter(p: Participant, filter: RosterFilter): boolean {
  return Object.entries(filter).every(([questionId, want]) => {
    const answers = picked(p, questionId);
    return want === NO_ANSWER ? answers.length === 0 : answers.includes(want);
  });
}

/** How many people picked each option, plus how many left the question blank. */
export function optionCounts(participants: Participant[], question: EventQuestion): Map<string, number> {
  const counts = new Map<string, number>((question.options ?? []).map(o => [o, 0]));
  counts.set(NO_ANSWER, 0);
  for (const p of participants) {
    const answers = picked(p, question.id).filter(o => counts.has(o));
    if (answers.length === 0) counts.set(NO_ANSWER, counts.get(NO_ANSWER)! + 1);
    for (const o of answers) counts.set(o, counts.get(o)! + 1);
  }
  return counts;
}
