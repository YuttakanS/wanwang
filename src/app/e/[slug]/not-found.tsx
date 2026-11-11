'use client';

import StatusPage from '@/components/StatusPage';
import { useI18n } from '@/lib/i18n';

/** The same message the event page shows when an event disappears while it is open. */
export default function EventNotFound() {
  const { t } = useI18n();
  return <StatusPage title={t('notFoundTitle')} description={t('notFoundDesc')} />;
}
