import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SlotHeatmapInfo } from '@/types';
import { NeoText } from '~/components/neo/NeoText';
import { fonts } from '~/constants/fonts';
import { borderWidths, heatColors } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

const GAP = 2;
const CELL_HEIGHT = 34;
const LABEL_WIDTH = 48;

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

  return (
    <View style={styles.table}>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.rowLabel} />
        {columnLabels.map((label, index) => (
          <NeoText key={`${label}-${index}`} variant="mono" style={styles.columnLabel}>
            {label}
          </NeoText>
        ))}
      </View>
      {rows.map(row => (
        <View key={row.key} style={styles.row}>
          <NeoText
            variant="mono"
            style={[styles.rowLabel, styles.label]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
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
                style={[
                  styles.cell,
                  { backgroundColor: background, borderColor: colors.ink, borderWidth: emphasized ? borderWidths.regular + 1 : borderWidths.thin },
                ]}
              >
                <Text style={[styles.count, { color: text }]} maxFontSizeMultiplier={1.2}>
                  {count > 0 ? `${count}/${total}` : '-'}
                </Text>
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
  label: { fontSize: 11, lineHeight: 14 },
  columnLabel: { flex: 1, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.monoBold, fontSize: 10 },
});
