import { StyleSheet, View } from 'react-native';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, ON_ACCENT } from '~/constants/theme';
import { useCopy } from '~/hooks/useCopy';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { buildAdminLink } from '~/services/deepLink';

interface AdminLinkNoticeProps {
  slug: string;
  adminKey: string;
  onDismiss: () => void;
}

export function AdminLinkNotice({ slug, adminKey, onDismiss }: AdminLinkNoticeProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { copied, failedText, copy } = useCopy();
  const link = buildAdminLink(slug, adminKey);

  return (
    <NeoCard tone="accent" emphasis style={styles.card}>
      <View style={styles.titles}>
        <NeoText variant="title" tone="onAccent" accessibilityRole="header">
          {t('adminNoticeTitle')}
        </NeoText>
        <NeoText tone="onAccent">{t('adminNoticeDesc')}</NeoText>
      </View>
      {/* The website's read-only field: selectable, so it can be copied by hand if copying fails. */}
      <View style={[styles.link, { backgroundColor: colors.surface, borderColor: ON_ACCENT }]}>
        <NeoText variant="mono" selectable style={styles.linkText}>
          {link}
        </NeoText>
      </View>
      {failedText && (
        <NeoText variant="caption" tone="onAccent">
          {t('adminNoticeCopyFailed')}
        </NeoText>
      )}
      <View style={styles.buttons}>
        <NeoButton
          label={copied === 'admin' ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
          variant="ink"
          size="sm"
          onPress={() => void copy('admin', link)}
        />
        <NeoButton label={t('adminNoticeDismiss')} variant="secondary" size="sm" onPress={onDismiss} />
      </View>
      <NeoText variant="caption" tone="onAccent">
        {t('adminNoticeWarning')}
      </NeoText>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  titles: { gap: 4 },
  link: { borderWidth: borderWidths.regular, paddingHorizontal: 12, paddingVertical: 10 },
  linkText: { fontSize: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
