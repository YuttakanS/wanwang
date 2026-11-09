'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t-3 border-black py-6 px-4 text-center font-mono text-xs text-[#525252] mt-12 bg-white space-y-1">
      <p>{t('footerText')}</p>
      <p>
        <Link href="/privacy" className="underline hover:text-black">
          {t('privacyLink')}
        </Link>
      </p>
    </footer>
  );
}
