'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function Navbar() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-white border-b-3 border-black">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-bold text-lg border-2 border-black group-hover:bg-[#FFE500] group-hover:text-black transition-colors">
            ว
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-lg text-black tracking-tight leading-tight">
              {t('appName')}
            </span>
            <span className="text-[11px] text-[#525252] leading-none hidden sm:inline">
              {t('appSubtitle')}
            </span>
          </div>
        </Link>

        {/* Right Actions: Lang Switcher [ ENG // TH ] + Create Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Toggle: [ ENG // TH ] */}
          <div className="inline-flex border-3 border-black bg-white" role="group" aria-label="Language selection">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 sm:px-3 py-1 font-mono text-xs font-bold transition-none ${
                lang === 'en'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[#F0F0F0]'
              }`}
            >
              ENG
            </button>
            <div className="w-[2px] bg-black" />
            <button
              type="button"
              onClick={() => setLang('th')}
              className={`px-2.5 sm:px-3 py-1 font-mono text-xs font-bold transition-none ${
                lang === 'th'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[#F0F0F0]'
              }`}
            >
              TH
            </button>
          </div>

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
