import { StyleSheet, View } from 'react-native';
import { formatLocalizedDateRange } from '@/lib/timeUtils';
import { datesOnPage, pageCount } from '~/calendar/slotPages';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoText } from '~/components/neo/NeoText';
import { useI18n } from '~/hooks/useI18n';

interface PageHeaderProps {
  dates: string[];
  page: number;
  onChange: (page: number) => void;
}

/** Moves through the weeks of a daypart or hourly event. */
export function PageHeader({ dates, page, onChange }: PageHeaderProps) {
  const { lang, t } = useI18n();
  const shown = datesOnPage(dates, page);
  const last = pageCount(dates) - 1;
  const range = shown.length > 0 ? formatLocalizedDateRange(shown[0], shown[shown.length - 1], lang) : '';

  return (
    <View style={styles.row}>
      <View style={styles.title}>
        <NeoText variant="label" accessibilityRole="header">
          {range}
        </NeoText>
        <NeoText variant="caption" tone="muted">
          {t('pageOfTotal', { page: page + 1, total: last + 1 })}
        </NeoText>
      </View>
      <NeoChip label="<" accessibilityLabel={t('prevPageLabel')} disabled={page <= 0} onPress={() => onChange(page - 1)} />
      <NeoChip label=">" accessibilityLabel={t('nextPageLabel')} disabled={page >= last} onPress={() => onChange(page + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
});
