import { useRouter } from 'expo-router';
import { NeoText } from '~/components/neo/NeoText';
import { useI18n } from '~/hooks/useI18n';

/** `text` says who can see what is being entered. */
export function PrivacyNote({ text }: { text?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <NeoText variant="caption" tone="muted">
      {text ? `${text} ` : ''}
      <NeoText variant="caption" tone="link" accessibilityRole="link" onPress={() => router.push('/privacy')}>
        {t('privacyLink')}
      </NeoText>
    </NeoText>
  );
}
