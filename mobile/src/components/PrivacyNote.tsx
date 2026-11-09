import * as WebBrowser from 'expo-web-browser';
import { NeoText } from '~/components/neo/NeoText';
import { apiUrl } from '~/constants/config';
import { useI18n } from '~/hooks/useI18n';

/** `text` says who can see what is being entered. */
export function PrivacyNote({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <NeoText variant="caption" tone="muted">
      {text ? `${text} ` : ''}
      <NeoText
        variant="caption"
        tone="link"
        accessibilityRole="link"
        onPress={() => void WebBrowser.openBrowserAsync(`${apiUrl}/privacy`).catch(() => {})}
      >
        {t('privacyLink')}
      </NeoText>
    </NeoText>
  );
}
