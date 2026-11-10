import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SlotHeatmapInfo } from '@/types';
import { NeoText } from '~/components/neo/NeoText';
import { fonts } from '~/constants/fonts';
import { borderWidths, heatColors, GRID_LABEL_MAX_SCALE } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

const GAP = 2;
const CELL_HEIGHT = 34;
const LABEL_WIDTH = 44;
// Seven columns on a small phone leave no room for "12/12", so narrow tables show only the count.
const NARROW_FROM_COLUMNS = 5;

export interface HeatRow {
  key: string;
  label: string;
  slotIds: string[];
}

interface HeatTableProps {
  columnLabels: string[];
  rows: HeatRow[];
  heatmap: Record<string, SlotHeatmapInfo>;
  total: number;
  isEmphasized: (slotId: string) => boolean;
  labelFor: (slotId: string, count: number) => string;
  onInspect: (slotId: string) => void;
}

/** The group view for daypart and hourly events: one page of slots, tinted by how many are free. */
export function HeatTable({ columnLabels, rows, heatmap, total, isEmphasized, labelFor, onInspect }: HeatTableProps) {
  const { colors } = useTheme();
  const narrow = columnLabels.length >= NARROW_FROM_COLUMNS;

  return (
    <View style={styles.table}>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.rowLabel} />
        {columnLabels.map((label, index) => (
          <NeoText key={`${label}-${index}`} variant="caption" maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={styles.columnLabel}>
            {label}
          </NeoText>
        ))}
      </View>
      {rows.map(row => (
        <View key={row.key} style={styles.row}>
          <NeoText variant="caption" maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={[styles.rowLabel, styles.label]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {row.label}
          </NeoText>
          {row.slotIds.map(slotId => {
            const info = heatmap[slotId];
            const count = info?.availableCount ?? 0;
            const { background, text } = heatColors(info?.percentage ?? 0, count, colors);
            const emphasized = isEmphasized(slotId);
            return (
              <Pressable
                key={slotId}
                accessibilityRole="button"
                accessibilityLabel={labelFor(slotId, count)}
                accessibilityState={{ selected: emphasized }}
                onPress={() => onInspect(slotId)}
                style={[styles.cell, { backgroundColor: background, borderColor: colors.ink }]}
              >
                <Text style={[styles.count, { color: text }]} maxFontSizeMultiplier={1.2}>
                  {count === 0 ? '-' : narrow ? count : `${count}/${total}`}
                </Text>
                {/* Drawn over the cell, because a thicker border on the cell itself would shift its row. */}
                {emphasized && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.emphasis, { borderColor: colors.ink }]} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP, alignItems: 'center' },
  rowLabel: { width: LABEL_WIDTH },
  label: { fontSize: 11 },
  columnLabel: { flex: 1, textAlign: 'center', fontSize: 11 },
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center', borderWidth: borderWidths.thin },
  emphasis: { borderWidth: borderWidths.thin },
  count: { fontFamily: fonts.monoBold, fontSize: 10 },
});
