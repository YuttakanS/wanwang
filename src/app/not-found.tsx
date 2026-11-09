'use client';

import StatusPage from '@/components/StatusPage';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return <StatusPage title={t('pageNotFoundTitle')} description={t('pageNotFoundDesc')} />;
}
