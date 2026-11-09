import { Linking, Share, StyleSheet, View } from 'react-native';
import { buildShareUrl, type ShareTarget } from '@/lib/shareTargets';
import { generateShareMessage } from '@/lib/timeUtils';
import type { Participant, WanWangEvent } from '@/types';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { useCopy } from '~/hooks/useCopy';
import { useI18n } from '~/hooks/useI18n';
import { buildEventUrl } from '~/services/deepLink';

interface SharePanelProps {
  event: WanWangEvent;
  participants: Participant[];
}

export function SharePanel({ event, participants }: SharePanelProps) {
  const { lang, t } = useI18n();
  const { copied, failedText, copy } = useCopy();
  const url = buildEventUrl(event.slug);

  // Built on press, because the summary scans every slot, which is slow on long events.
  const message = () => generateShareMessage(event, participants, url, lang);

  const shareTo = (target: ShareTarget) => {
    // The share sheet below still works if the phone has nothing to open this with.
    Linking.openURL(buildShareUrl(target, event, participants, url, lang)).catch(() => {});
  };

  return (
    <View style={styles.panel}>
      <View style={styles.buttons}>
        <NeoButton label={t('shareToggleBtn')} size="sm" onPress={() => void Share.share({ message: message() }).catch(() => {})} />
        <NeoButton label={t('shareLineBtn')} variant="secondary" size="sm" onPress={() => shareTo('line')} />
        <NeoButton label={t('shareWhatsappBtn')} variant="secondary" size="sm" onPress={() => shareTo('whatsapp')} />
        <NeoButton
          label={copied === 'summary' ? t('copySummaryDone') : t('copySummaryBtn')}
          variant="secondary"
          size="sm"
          onPress={() => void copy('summary', message())}
        />
        <NeoButton
          label={copied === 'link' ? t('copyLinkDone') : t('copyLinkBtn')}
          variant="secondary"
          size="sm"
          onPress={() => void copy('link', url)}
        />
      </View>
      {failedText && (
        <>
          <NeoNotice message={t('copyManualNotice')} />
          <NeoText variant="caption" selectable>
            {failedText}
          </NeoText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
