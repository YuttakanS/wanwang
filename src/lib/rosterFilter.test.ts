import { describe, expect, it } from 'vitest';
import { makeParticipant } from '@/test/fixtures';
import type { EventQuestion } from '@/types';
import { NO_ANSWER, activeFilter, filterableQuestions, matchesFilter, optionCounts } from './rosterFilter';

const section: EventQuestion = { id: 'section1', type: 'choice', label: 'Section', required: false, options: ['A', 'B'] };
const colours: EventQuestion = { id: 'colours1', type: 'multi', label: 'Colours', required: false, options: ['Red', 'Blue'] };
const notes: EventQuestion = { id: 'notes001', type: 'text', label: 'Notes', required: false };
const model: EventQuestion = { id: 'model001', type: 'file', label: 'Model', required: false };

const ann = makeParticipant({ id: 'ann', answers: { section1: 'A', colours1: ['Red', 'Blue'] } });
const bob = makeParticipant({ id: 'bob', answers: { section1: 'B', colours1: ['Blue'] } });
const cat = makeParticipant({ id: 'cat', answers: { section1: 'A' } });
const dan = makeParticipant({ id: 'dan' }); // answers not sent: not mine, and I am not the creator
const everyone = [ann, bob, cat, dan];

const shown = (filter: Record<string, string>) => everyone.filter(p => matchesFilter(p, filter)).map(p => p.id);

describe('filterableQuestions', () => {
  it('offers only questions with fixed options', () => {
    expect(filterableQuestions([section, notes, colours, model]).map(q => q.id)).toEqual(['section1', 'colours1']);
  });
});

describe('matchesFilter', () => {
  it('shows everyone when nothing is chosen', () => {
    expect(shown({})).toEqual(['ann', 'bob', 'cat', 'dan']);
  });

  it('shows the people who picked the option', () => {
    expect(shown({ section1: 'A' })).toEqual(['ann', 'cat']);
    expect(shown({ section1: 'B' })).toEqual(['bob']);
  });

  it('matches any of the options picked on a pick-several question', () => {
    expect(shown({ colours1: 'Blue' })).toEqual(['ann', 'bob']);
  });

  it('needs a match on every question that has a choice set', () => {
    expect(shown({ section1: 'A', colours1: 'Red' })).toEqual(['ann']);
    expect(shown({ section1: 'B', colours1: 'Red' })).toEqual([]);
  });

  it('can show the people who left a question blank', () => {
    expect(shown({ colours1: NO_ANSWER })).toEqual(['cat', 'dan']);
  });
});

describe('activeFilter', () => {
  it('drops a choice whose question or option is gone', () => {
    const filter = { section1: 'C', colours1: 'Red', gone0001: 'x', notes001: 'hi' };
    expect(activeFilter(filter, [section, colours, notes])).toEqual({ colours1: 'Red' });
  });

  it('keeps the blank choice', () => {
    expect(activeFilter({ section1: NO_ANSWER }, [section])).toEqual({ section1: NO_ANSWER });
  });
});

describe('optionCounts', () => {
  it('counts each option and the people who left it blank', () => {
    expect([...optionCounts(everyone, section)]).toEqual([['A', 2], ['B', 1], [NO_ANSWER, 1]]);
    expect([...optionCounts(everyone, colours)]).toEqual([['Red', 1], ['Blue', 2], [NO_ANSWER, 2]]);
  });

  it('counts an answer to an option that was since removed as blank', () => {
    const old = makeParticipant({ answers: { section1: 'Z' } });
    expect(optionCounts([old], section).get(NO_ANSWER)).toBe(1);
  });
});
