'use client';

import React, { useId, useState } from 'react';
import { Answers, EventQuestion, QUESTION_LIMITS, isFileAnswer } from '@/types';
import { useI18n } from '@/lib/i18n';

interface QuestionFieldsProps {
  slug: string;
  questions: EventQuestion[];
  answers: Answers;
  onChange: (next: Answers) => void;
  /** True while a file is on its way up, so the form can hold its submit button. */
  onUploadingChange: (uploading: boolean) => void;
}

const inputClass =
  'block w-full min-w-0 px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none';

const MB = 1024 * 1024;
export const formatFileSize = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

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

/** The creator's questions, as the respondent fills them in. */
export default function QuestionFields({ slug, questions, answers, onChange, onUploadingChange }: QuestionFieldsProps) {
  const { t } = useI18n();
  const idBase = useId();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: Answers[string] | undefined) => {
    const next = { ...answers };
    if (value === undefined) delete next[id];
    else next[id] = value;
    onChange(next);
  };

  const setFileError = (id: string, message: string) => setFileErrors(prev => ({ ...prev, [id]: message }));

  const handleFile = async (q: EventQuestion, file: File | undefined) => {
    if (!file) return;
    setFileError(q.id, '');

    if (file.size === 0) {
      setFileError(q.id, t('fileErrorEmpty'));
      return;
    }
    if (file.size > QUESTION_LIMITS.fileBytes) {
      setFileError(q.id, t('fileErrorTooLarge', { max: formatFileSize(QUESTION_LIMITS.fileBytes) }));
      return;
    }
    // Shortened from the front so the extension survives.
    const name = file.name.length > QUESTION_LIMITS.fileName ? file.name.slice(-QUESTION_LIMITS.fileName) : file.name;

    setUploadingId(q.id);
    onUploadingChange(true);
    try {
      const res = await fetch(`/api/events/${slug}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, name, size: file.size }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.uploadUrl) throw new Error(data.error || t('fileErrorFailed'));

      // Straight to storage: the signed URL is the only credential, and it is for this one path.
      const put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
        body: file,
      });
      if (!put.ok) throw new Error(t('fileErrorFailed'));

      setAnswer(q.id, { path: data.path, name, size: file.size });
    } catch (err) {
      setFileError(q.id, (err as Error)?.message || t('fileErrorFailed'));
    } finally {
      setUploadingId(null);
      onUploadingChange(false);
    }
  };

  if (questions.length === 0) return null;

  return (
    <div className="space-y-4 border-b-3 border-ink pb-4">
      <p className="text-xs text-muted">{t('answersVisibilityNote')}</p>

      {questions.map(q => {
        const fieldId = `${idBase}-${q.id}`;
        const answer = answers[q.id];
        const label = (
          <>
            {q.label}
            {q.required && <span aria-hidden="true"> *</span>}
          </>
        );

        if (q.type === 'text') {
          return (
            <div key={q.id}>
              <label htmlFor={fieldId} className="block text-sm font-bold text-ink mb-1">
                {label}
              </label>
              <textarea
                id={fieldId}
                rows={2}
                required={q.required}
                maxLength={QUESTION_LIMITS.textAnswer}
                value={typeof answer === 'string' ? answer : ''}
                onChange={e => setAnswer(q.id, e.target.value || undefined)}
                className={`${inputClass} resize-y`}
              />
            </div>
          );
        }

        if (q.type === 'choice' || q.type === 'multi') {
          const picked = q.type === 'multi' ? (Array.isArray(answer) ? answer : []) : [];
          return (
            <fieldset key={q.id}>
              <legend className="block text-sm font-bold text-ink mb-1.5">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map(option => {
                  const isOn = q.type === 'multi' ? picked.includes(option) : answer === option;
                  const toggle = () => {
                    if (q.type === 'multi') {
                      const next = isOn ? picked.filter(o => o !== option) : [...picked, option];
                      setAnswer(q.id, next.length > 0 ? next : undefined);
                    } else {
                      // Picking the chosen option again clears it, so an optional question can be left blank.
                      setAnswer(q.id, isOn ? undefined : option);
                    }
                  };
                  return (
                    <button
                      key={option}
                      type="button"
                      role={q.type === 'multi' ? 'checkbox' : 'radio'}
                      aria-checked={isOn}
                      onClick={toggle}
                      className={`px-3 py-2 border-2 border-ink text-xs font-semibold text-left transition-none cursor-pointer ${
                        isOn ? 'bg-ink text-on-ink-accent' : 'bg-surface text-ink hover:bg-sunken'
                      }`}
                    >
                      <span className="font-mono mr-1.5">{isOn ? '[✓]' : '[ ]'}</span>
                      {option}
                    </button>
                  );
                })}
              </div>
              {q.type === 'multi' && <p className="text-xs text-muted mt-1">{t('multiChoiceHint')}</p>}
            </fieldset>
          );
        }

        const file = isFileAnswer(answer) ? answer : null;
        const isUploading = uploadingId === q.id;
        return (
          <div key={q.id}>
            <label htmlFor={fieldId} className="block text-sm font-bold text-ink mb-1">
              {label}
            </label>
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-3 border-ink bg-sunken">
                <span className="font-mono text-xs text-ink break-all">
                  {file.name} <span className="text-muted">({formatFileSize(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAnswer(q.id, undefined)}
                  className="px-2.5 py-1 bg-surface hover:bg-ink hover:text-surface text-ink border-2 border-ink font-mono text-xs font-bold transition-none cursor-pointer"
                >
                  {t('fileRemoveBtn')}
                </button>
              </div>
            ) : (
              <input
                id={fieldId}
                type="file"
                disabled={uploadingId !== null}
                onChange={e => {
                  void handleFile(q, e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="block w-full text-xs text-ink font-mono border-3 border-ink bg-sunken file:mr-3 file:px-3 file:py-2 file:border-0 file:border-r-3 file:border-ink file:bg-ink file:text-surface file:font-bold file:cursor-pointer disabled:opacity-50"
              />
            )}
            <p className="text-xs text-muted mt-1" aria-live="polite">
              {isUploading ? t('fileUploading') : t('fileHelper', { max: formatFileSize(QUESTION_LIMITS.fileBytes) })}
            </p>
            {fileErrors[q.id] && (
              <p role="alert" className="mt-1 p-2 bg-accent border-2 border-ink text-black font-mono text-xs">
                [ERROR] {fileErrors[q.id]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
