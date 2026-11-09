import { StyleSheet, View } from 'react-native';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { useCopy } from '~/hooks/useCopy';
import { useI18n } from '~/hooks/useI18n';
import { buildAdminLink } from '~/services/deepLink';

interface AdminLinkNoticeProps {
  slug: string;
  adminKey: string;
  onDismiss: () => void;
}

export function AdminLinkNotice({ slug, adminKey, onDismiss }: AdminLinkNoticeProps) {
  const { t } = useI18n();
  const { copied, failedText, copy } = useCopy();
  const link = buildAdminLink(slug, adminKey);

  return (
    <NeoCard tone="accent" emphasis style={styles.card}>
      <NeoText variant="heading" tone="onAccent">
        {t('adminNoticeTitle')}
      </NeoText>
      <NeoText tone="onAccent">{t('adminNoticeDesc')}</NeoText>
      <NeoText variant="caption" tone="onAccent" selectable>
        {link}
      </NeoText>
      <NeoText variant="caption" tone="onAccent">
        {t('adminNoticeWarning')}
      </NeoText>
      {failedText && <NeoNotice tone="sunken" message={t('adminNoticeCopyFailed')} />}
      <View style={styles.buttons}>
        <NeoButton
          label={copied === 'admin' ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
          variant="secondary"
          size="sm"
          onPress={() => void copy('admin', link)}
        />
        <NeoButton label={t('adminNoticeDismiss')} variant="secondary" size="sm" onPress={onDismiss} />
      </View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
