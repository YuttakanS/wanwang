import { StyleSheet, View } from 'react-native';
import { formatDateToISO, formatLocalizedDate, getWeekdayHeaders } from '@/lib/timeUtils';
import { canShowMonth } from '~/calendar/monthPaging';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoText } from '~/components/neo/NeoText';
import { useI18n } from '~/hooks/useI18n';

// Same as the grids below it, so each weekday stays over its column.
const GAP = 4;

interface MonthHeaderProps {
  month: Date;
  rangeStart: string;
  rangeEnd: string;
  onChange: (month: Date) => void;
}

export function MonthHeader({ month, rangeStart, rangeEnd, onChange }: MonthHeaderProps) {
  const { lang, t } = useI18n();
  const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <NeoText variant="label" accessibilityRole="header" style={styles.title}>
          {formatLocalizedDate(formatDateToISO(month), lang, 'monthYear')}
        </NeoText>
        <NeoChip
          label="<"
          accessibilityLabel={t('prevMonthLabel')}
          disabled={!canShowMonth(previous, rangeStart, rangeEnd)}
          onPress={() => onChange(previous)}
        />
        <NeoChip
          label=">"
          accessibilityLabel={t('nextMonthLabel')}
          disabled={!canShowMonth(next, rangeStart, rangeEnd)}
          onPress={() => onChange(next)}
        />
      </View>
      <View style={styles.weekdays} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {getWeekdayHeaders(lang).map((day, index) => (
          <NeoText key={`${day}-${index}`} variant="caption" tone={index === 0 || index === 6 ? 'ink' : 'muted'} style={styles.weekday}>
            {day}
          </NeoText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  weekdays: { flexDirection: 'row', gap: GAP },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12 },
});
