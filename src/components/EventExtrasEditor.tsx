'use client';

import React, { useId } from 'react';
import { EventQuestion, QUESTION_LIMITS, QUESTION_TYPES, QuestionType, WanWangEvent } from '@/types';
import { useI18n } from '@/lib/i18n';

/** A question while it is being edited. Options are typed one per line. */
export interface DraftQuestion {
  /** Stable React key; never sent. */
  key: string;
  /** Set for a question that already exists, so its answers stay attached to it. */
  id?: string;
  type: QuestionType;
  label: string;
  required: boolean;
  optionsText: string;
}

/** The optional part of an event: limits on picking slots, and the creator's own questions. */
export interface EventExtras {
  maxPerSlot: string;
  maxPicks: string;
  questions: DraftQuestion[];
}

export const EMPTY_EXTRAS: EventExtras = { maxPerSlot: '', maxPicks: '', questions: [] };

const TYPE_LABEL_KEYS: Record<QuestionType, string> = {
  text: 'questionTypeText',
  choice: 'questionTypeChoice',
  multi: 'questionTypeMulti',
  file: 'questionTypeFile',
};

let draftCounter = 0;
const newKey = () => `q${++draftCounter}`;

const hasOptions = (type: QuestionType) => type === 'choice' || type === 'multi';
const optionsOf = (q: DraftQuestion) =>
  Array.from(new Set(q.optionsText.split('\n').map(o => o.trim()).filter(Boolean)));

export function extrasFromEvent(event: WanWangEvent): EventExtras {
  return {
    maxPerSlot: event.maxPerSlot ? String(event.maxPerSlot) : '',
    maxPicks: event.maxPicks ? String(event.maxPicks) : '',
    questions: (event.questions ?? []).map(q => ({
      key: newKey(),
      id: q.id,
      type: q.type,
      label: q.label,
      required: q.required,
      optionsText: (q.options ?? []).join('\n'),
    })),
  };
}

const limitOf = (text: string) => (text.trim() === '' ? null : Number(text));

/** What the API takes. Call extrasError first. */
export function extrasToPayload(extras: EventExtras): {
  maxPerSlot: number | null;
  maxPicks: number | null;
  questions: Partial<EventQuestion>[];
} {
  return {
    maxPerSlot: limitOf(extras.maxPerSlot),
    maxPicks: limitOf(extras.maxPicks),
    questions: extras.questions.map(q => ({
      ...(q.id ? { id: q.id } : {}),
      type: q.type,
      label: q.label.trim(),
      required: q.required,
      ...(hasOptions(q.type) ? { options: optionsOf(q) } : {}),
    })),
  };
}

/** A translation key for the first problem, or null when the extras can be saved. */
export function extrasError(extras: EventExtras): string | null {
  for (const [text, max] of [
    [extras.maxPerSlot, QUESTION_LIMITS.maxPerSlot],
    [extras.maxPicks, Number.MAX_SAFE_INTEGER],
  ] as const) {
    const n = limitOf(text);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > max)) return 'extrasErrorLimit';
  }
  for (const q of extras.questions) {
    if (!q.label.trim()) return 'extrasErrorLabel';
    if (hasOptions(q.type) && optionsOf(q).length === 0) return 'extrasErrorOptions';
  }
  return null;
}

const inputClass =
  'block w-full min-w-0 px-3 py-2 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none';
const chipClass =
  'px-2.5 py-1 bg-surface hover:bg-ink hover:text-surface text-ink border-2 border-ink font-mono text-xs font-bold transition-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-ink';

interface EventExtrasEditorProps {
  value: EventExtras;
  onChange: (next: EventExtras) => void;
}

export default function EventExtrasEditor({ value, onChange }: EventExtrasEditorProps) {
  const { t } = useI18n();
  const idBase = useId();
  const { questions } = value;

  const setQuestion = (key: string, patch: Partial<DraftQuestion>) =>
    onChange({ ...value, questions: questions.map(q => (q.key === key ? { ...q, ...patch } : q)) });

  const addQuestion = (type: QuestionType) =>
    onChange({
      ...value,
      questions: [...questions, { key: newKey(), type, label: '', required: false, optionsText: '' }],
    });

  const move = (index: number, by: -1 | 1) => {
    const next = [...questions];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange({ ...value, questions: next });
  };

  const atMax = questions.length >= QUESTION_LIMITS.maxQuestions;

  return (
    <div className="space-y-5">
      {/* Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idBase}-cap`} className="block text-sm font-bold text-ink mb-1">
            {t('maxPerSlotLabel')}
          </label>
          <input
            id={`${idBase}-cap`}
            type="number"
            inputMode="numeric"
            min={1}
            max={QUESTION_LIMITS.maxPerSlot}
            value={value.maxPerSlot}
            onChange={e => onChange({ ...value, maxPerSlot: e.target.value })}
            placeholder={t('noLimitPlaceholder')}
            className={`${inputClass} font-mono`}
          />
          <p className="text-xs text-muted mt-1">{t('maxPerSlotHelper')}</p>
        </div>
        <div>
          <label htmlFor={`${idBase}-picks`} className="block text-sm font-bold text-ink mb-1">
            {t('maxPicksLabel')}
          </label>
          <input
            id={`${idBase}-picks`}
            type="number"
            inputMode="numeric"
            min={1}
            value={value.maxPicks}
            onChange={e => onChange({ ...value, maxPicks: e.target.value })}
            placeholder={t('noLimitPlaceholder')}
            className={`${inputClass} font-mono`}
          />
          <p className="text-xs text-muted mt-1">{t('maxPicksHelper')}</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3 border-t-2 border-ink pt-4">
        <div>
          <h3 className="text-sm font-bold text-ink">{t('questionsTitle')}</h3>
          <p className="text-xs text-muted mt-0.5">{t('questionsHelper')}</p>
        </div>

        {questions.map((q, index) => (
          <fieldset key={q.key} className="border-2 border-ink p-3 space-y-3 bg-surface">
            <legend className="px-1.5 font-mono text-xs font-bold text-ink">
              {index + 1}. {t(TYPE_LABEL_KEYS[q.type])}
            </legend>

            <div>
              <label htmlFor={`${idBase}-${q.key}-label`} className="block text-xs font-bold text-ink mb-1">
                {t('questionLabelLabel')}
              </label>
              <input
                id={`${idBase}-${q.key}-label`}
                type="text"
                maxLength={QUESTION_LIMITS.label}
                value={q.label}
                onChange={e => setQuestion(q.key, { label: e.target.value })}
                placeholder={t(q.type === 'file' ? 'questionLabelPlaceholderFile' : 'questionLabelPlaceholder')}
                className={inputClass}
              />
            </div>

            {hasOptions(q.type) && (
              <div>
                <label htmlFor={`${idBase}-${q.key}-options`} className="block text-xs font-bold text-ink mb-1">
                  {t('questionOptionsLabel')}
                </label>
                <textarea
                  id={`${idBase}-${q.key}-options`}
                  rows={3}
                  value={q.optionsText}
                  onChange={e => setQuestion(q.key, { optionsText: e.target.value })}
                  placeholder={t('questionOptionsPlaceholder')}
                  className={`${inputClass} resize-y`}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={e => setQuestion(q.key, { required: e.target.checked })}
                  className="w-4 h-4 accent-black"
                />
                {t('questionRequiredLabel')}
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t('questionMoveUp')}
                  className={chipClass}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === questions.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t('questionMoveDown')}
                  className={chipClass}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, questions: questions.filter(x => x.key !== q.key) })}
                  className={chipClass}
                >
                  {t('questionRemoveBtn')}
                </button>
              </div>
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-ink mr-1">{t('questionAddLabel')}</span>
          {QUESTION_TYPES.map(type => (
            <button key={type} type="button" disabled={atMax} onClick={() => addQuestion(type)} className={chipClass}>
              + {t(TYPE_LABEL_KEYS[type])}
            </button>
          ))}
        </div>
        {atMax && (
          <p className="text-xs text-muted">{t('questionsMaxNote', { max: QUESTION_LIMITS.maxQuestions })}</p>
        )}
      </div>
    </div>
  );
}
