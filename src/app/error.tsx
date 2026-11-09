'use client';

import { useEffect } from 'react';
import StatusPage from '@/components/StatusPage';
import { useI18n } from '@/lib/i18n';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return <StatusPage title={t('errorTitle')} description={t('errorDesc')} onRetry={reset} />;
}
