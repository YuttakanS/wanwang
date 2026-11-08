'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import CreateEventForm from '@/components/CreateEventForm';
import MyEvents from '@/components/MyEvents';
import { useI18n } from '@/lib/i18n';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-10 motion-stagger">
        {/* Hero Section */}
        <div className="space-y-3 border-b-5 border-black pb-8">
          <div className="inline-block px-2.5 py-0.5 bg-black text-[#FFE500] font-mono text-xs font-bold">
            {t('heroBadge')}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black leading-tight">
            {t('heroHeadline1')} <br className="hidden sm:inline" />
            <span className="bg-[#FFE500] px-1 inline-block motion-highlight">
              {t('heroHeadline2')}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-black max-w-xl leading-relaxed">
            {t('heroDescription')}
          </p>
        </div>

        <MyEvents />

        {/* Create Event Form */}
        <CreateEventForm />

        {/* Feature Highlights Grid */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border-3 border-black p-4 space-y-1.5">
            <div className="font-bold text-sm text-black">
              1. {t('feat1Title')}
            </div>
            <p className="text-xs text-[#525252] leading-relaxed">
              {t('feat1Desc')}
            </p>
          </div>

          <div className="bg-white border-3 border-black p-4 space-y-1.5">
            <div className="font-bold text-sm text-black">
              2. {t('feat2Title')}
            </div>
            <p className="text-xs text-[#525252] leading-relaxed">
              {t('feat2Desc')}
            </p>
          </div>

          <div className="bg-white border-3 border-black p-4 space-y-1.5">
            <div className="font-bold text-sm text-black">
              3. {t('feat3Title')}
            </div>
            <p className="text-xs text-[#525252] leading-relaxed">
              {t('feat3Desc')}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-black py-6 text-center font-mono text-xs text-[#525252] mt-12 bg-white">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}
