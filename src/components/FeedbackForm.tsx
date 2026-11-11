'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import { useI18n } from '@/lib/i18n';
import { FEEDBACK_MAX_LENGTH, FEEDBACK_TYPES, FeedbackType } from '@/types';

const TYPE_LABEL_KEYS: Record<FeedbackType, string> = {
  bug: 'feedbackTypeBug',
  idea: 'feedbackTypeIdea',
  praise: 'feedbackTypePraise',
  other: 'feedbackTypeOther',
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function FeedbackForm() {
  const { t } = useI18n();

  const [type, setType] = useState<FeedbackType>('idea');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!message.trim()) {
      setErrorMsg(t('feedbackErrorEmpty'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, rating, message: message.trim() }),
      });
      if (!res.ok) {
        // Only the rate limiter's message is written for users; the rest are developer strings.
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 429 && data.error ? data.error : t('feedbackErrorFailed'));
      }
      setSent(true);
      setMessage('');
      setRating(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error && err.message ? err.message : t('feedbackErrorFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto py-10 px-4">
        {sent ? (
          <div className="border-3 border-ink p-6 bg-surface space-y-3 text-center" role="status">
            <h1 className="text-xl font-bold">{t('feedbackThanksTitle')}</h1>
            <p className="text-sm text-muted">{t('feedbackThanksDesc')}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button type="button" onClick={() => setSent(false)} className="btn-secondary-raw px-4 py-2 text-xs">
                {t('feedbackSendAnother')}
              </button>
              <Link href="/" className="btn-primary-raw px-4 py-2 text-xs">
                {t('returnHomeBtn')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-5">
            <header className="border-b-3 border-ink pb-3">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{t('feedbackTitle')}</h1>
              <p className="text-sm text-muted mt-0.5">{t('feedbackSubtitle')}</p>
            </header>

            <fieldset>
              <legend className="block text-sm font-bold mb-1.5">{t('feedbackTypeLabel')}</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEEDBACK_TYPES.map(id => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={type === id}
                    onClick={() => setType(id)}
                    className={`px-3 py-2 border-2 border-ink text-xs font-semibold text-left transition-none ${
                      type === id ? 'bg-ink text-on-ink-accent motion-pop' : 'bg-surface text-ink hover:bg-sunken'
                    }`}
                  >
                    {t(TYPE_LABEL_KEYS[id])}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block text-sm font-bold mb-1.5">{t('feedbackRatingLabel')}</legend>
              <div className="inline-grid grid-cols-5 border-3 border-ink divide-x-2 divide-ink">
                {RATINGS.map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={rating === n}
                    aria-label={t('feedbackRatingAria', { n })}
                    // Tapping the chosen score again clears it: the rating is optional.
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`w-11 h-11 font-mono text-sm font-bold transition-none ${
                      rating === n ? 'bg-accent text-black' : 'bg-surface text-ink hover:bg-sunken'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1">{t('feedbackRatingHelper')}</p>
            </fieldset>

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-bold mb-1">
                {t('feedbackMessageLabel')}
              </label>
              <textarea
                id="feedback-message"
                required
                rows={6}
                maxLength={FEEDBACK_MAX_LENGTH}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('feedbackMessagePlaceholder')}
                className="w-full px-3 py-2.5 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink font-sans text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none resize-y"
              />
              <p className="font-mono text-xs text-muted mt-1 text-right">
                {message.length}/{FEEDBACK_MAX_LENGTH}
              </p>
            </div>

            <p className="text-xs text-muted">
              {t('feedbackPrivacyNote')}{' '}
              <Link href="/privacy" target="_blank" rel="noopener" className="underline hover:text-ink">
                {t('privacyLink')}
              </Link>
            </p>

            {errorMsg && (
              <div role="alert" className="p-3 border-3 border-ink text-black font-mono text-xs bg-accent motion-shake">
                [ERROR] {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary-raw w-full sm:w-auto px-8 py-3 text-base cursor-pointer"
            >
              {isLoading ? t('feedbackSending') : t('feedbackSubmit')}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
