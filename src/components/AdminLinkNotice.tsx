'use client';

import React, { useEffect, useState } from 'react';
import { buildAdminLink } from '@/lib/adminAccess';
import { copyText } from '@/lib/clipboard';
import { useI18n } from '@/lib/i18n';

interface AdminLinkNoticeProps {
  slug: string;
  adminKey: string;
  onDismiss: () => void;
}

export default function AdminLinkNotice({ slug, adminKey, onDismiss }: AdminLinkNoticeProps) {
  const { t } = useI18n();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    setLink(buildAdminLink(slug, adminKey));
  }, [slug, adminKey]);

  const handleCopy = async () => {
    if (await copyText(link)) {
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  };

  return (
    <section className="bg-[#FFE500] border-5 border-black p-5 sm:p-6 space-y-3 motion-pop">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-black leading-tight">
          {t('adminNoticeTitle')}
        </h2>
        <p className="text-sm text-black mt-1">{t('adminNoticeDesc')}</p>
      </div>

      <input
        type="text"
        readOnly
        aria-label={t('adminNoticeTitle')}
        value={link}
        onFocus={e => e.target.select()}
        className="w-full px-3 py-2.5 bg-white border-3 border-black text-black font-mono text-xs focus:outline-none focus:ring-2 focus:ring-black"
      />

      {copyFailed && (
        <p className="font-mono text-xs text-black motion-shake">{t('adminNoticeCopyFailed')}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 bg-black text-white hover:bg-white hover:text-black border-3 border-black text-xs font-bold cursor-pointer transition-none"
        >
          {copied ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="btn-secondary-raw px-4 py-2 text-xs font-semibold cursor-pointer"
        >
          {t('adminNoticeDismiss')}
        </button>
      </div>

      <p className="text-xs text-black">{t('adminNoticeWarning')}</p>
    </section>
  );
}
