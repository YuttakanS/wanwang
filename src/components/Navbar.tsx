'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useI18n } from '@/lib/i18n';

export default function Navbar() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-surface border-b-3 border-ink">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div aria-hidden="true" className="w-9 h-9 bg-ink text-surface flex items-center justify-center font-bold text-lg border-2 border-ink group-hover:bg-accent group-hover:text-ink transition-colors">
            ว
          </div>
          {/* The logo alone has to do on small phones, or the actions run off the screen.
              The name stays for screen readers there, so it is still the link's name. */}
          <div className="sr-only min-[400px]:not-sr-only min-[400px]:flex flex-col justify-center">
            <span className="font-bold text-lg text-ink tracking-tight leading-tight">
              {t('appName')}
            </span>
            <span className="text-[11px] text-muted leading-none hidden sm:inline">
              {t('appSubtitle')}
            </span>
          </div>
        </Link>

        {/* Right Actions: Lang Switcher [ ENG // TH ] + Create Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Toggle: [ ENG // TH ] */}
          <div className="inline-flex border-3 border-ink bg-surface" role="group" aria-label={t('langGroupLabel')}>
            <button
              type="button"
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
              className={`px-2.5 sm:px-3 py-1 font-mono text-xs font-bold transition-none ${
                lang === 'en'
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-ink hover:bg-sunken'
              }`}
            >
              ENG
            </button>
            <div className="w-[2px] bg-ink" />
            <button
              type="button"
              aria-pressed={lang === 'th'}
              onClick={() => setLang('th')}
              className={`px-2.5 sm:px-3 py-1 font-mono text-xs font-bold transition-none ${
                lang === 'th'
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-ink hover:bg-sunken'
              }`}
            >
              TH
            </button>
          </div>

          <ThemeToggle />

          {/* Primary Create Button */}
          <Link
            href="/"
            className="btn-primary-raw px-3 sm:px-4 py-1.5 text-xs sm:text-sm shrink-0 whitespace-nowrap"
          >
            {t('createEventBtn')}
          </Link>
        </div>
      </div>
    </header>
  );
}
