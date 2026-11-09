import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MonthCell } from '@/lib/monthCells';
import { fonts } from '~/constants/fonts';
import { borderWidths } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

const GAP = 4;
const COLUMNS = 7;

interface MonthGridProps {
  days: MonthCell[];
  renderCell: (day: MonthCell) => ReactNode;
}

/** A month of tappable cells. Dragging across days needs DayGrid instead. */
export function MonthGrid({ days, renderCell }: MonthGridProps) {
  const rows: MonthCell[][] = [];
  for (let i = 0; i < days.length; i += COLUMNS) rows.push(days.slice(i, i + COLUMNS));

  return (
    <View style={styles.grid}>
      {rows.map(row => (
        <View key={row[0].dateStr} style={styles.row}>
          {row.map(day => (
            <View key={day.dateStr} style={styles.cellBox}>
              {renderCell(day)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

interface GridCellProps {
  dayNumber: number;
  detail?: string;
  backgroundColor: string;
  color: string;
  emphasized?: boolean;
  accessibilityLabel: string;
  selected?: boolean;
  onPress: () => void;
}

export function GridCell({ dayNumber, detail, backgroundColor, color, emphasized = false, accessibilityLabel, selected = false, onPress }: GridCellProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor, borderColor: colors.ink, borderWidth: emphasized ? borderWidths.regular + 1 : borderWidths.thin },
      ]}
    >
      <Text style={[styles.day, { color }]} maxFontSizeMultiplier={1.3}>
        {dayNumber}
      </Text>
      {detail ? (
        <Text style={[styles.detail, { color }]} maxFontSizeMultiplier={1.2}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function DisabledGridCell({ dayNumber }: { dayNumber: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cell, { backgroundColor: colors.sunken, borderColor: colors.lineSoft, borderWidth: borderWidths.thin }]}
    >
      <Text style={[styles.disabledDay, { color: colors.faint }]} maxFontSizeMultiplier={1.3}>
        {dayNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cellBox: { flex: 1, aspectRatio: 1 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: fonts.monoBold, fontSize: 14 },
  detail: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 12 },
  disabledDay: { fontFamily: fonts.mono, fontSize: 14 },
});
