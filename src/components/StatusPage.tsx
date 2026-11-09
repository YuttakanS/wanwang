'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useI18n } from '@/lib/i18n';

interface StatusPageProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

/** Full-page message for "not found" and failure states. */
export default function StatusPage({ title, description, onRetry }: StatusPageProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Navbar />
      <main className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="border-3 border-ink p-6 bg-surface space-y-3">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-muted">{description}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-primary-raw px-4 py-2 text-xs">
                {t('retryBtn')}
              </button>
            )}
            <Link
              href="/"
              className={`${onRetry ? 'btn-secondary-raw' : 'btn-primary-raw'} px-4 py-2 text-xs`}
            >
              {t('returnHomeBtn')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
