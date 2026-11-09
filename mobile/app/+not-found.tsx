import { useRouter } from 'expo-router';
import { NeoButton } from '~/components/neo/NeoButton';
import { StatusScreen } from '~/components/StatusScreen';
import { useI18n } from '~/hooks/useI18n';

export default function NotFoundScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <StatusScreen title={t('pageNotFoundTitle')} description={t('pageNotFoundDesc')}>
      <NeoButton label={t('returnHomeBtn')} size="sm" onPress={() => router.dismissTo('/')} />
    </StatusScreen>
  );
}
