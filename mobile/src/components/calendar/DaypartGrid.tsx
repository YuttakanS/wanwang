import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatLocalizedDate } from '@/lib/timeUtils';
import type { DayPartId } from '@/types';
import type { SelectionStore } from '~/calendar/selectionStore';
import { DAY_PART_IDS, dayColumnLabel, daypartSlotId } from '~/calendar/slotPages';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, ON_ACCENT, GRID_LABEL_MAX_SCALE } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useIsSlotSelected } from '~/hooks/useSelectionStore';
import { useTheme } from '~/hooks/useTheme';

const GAP = 2;
const CELL_HEIGHT = 44;
const DATE_COLUMN_WIDTH = 52;

export const PART_LABEL_KEYS: Record<DayPartId, { name: string; range: string }> = {
  morning: { name: 'partMorning', range: 'partMorningRange' },
  afternoon: { name: 'partAfternoon', range: 'partAfternoonRange' },
  evening: { name: 'partEvening', range: 'partEveningRange' },
  night: { name: 'partNight', range: 'partNightRange' },
};

interface PartCellProps {
  slotId: string;
  label: string;
  store: SelectionStore;
}

function PartCell({ slotId, label, store }: PartCellProps) {
  const { colors } = useTheme();
  const isSelected = useIsSlotSelected(store, slotId);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={() => {
        // A refusal has its own haptic, from whoever listens to the store.
        if (store.toggle(slotId)) Haptics.selectionAsync().catch(() => {});
      }}
      style={[styles.cell, isSelected ? { backgroundColor: colors.accent, borderColor: ON_ACCENT } : { backgroundColor: colors.surface, borderColor: colors.ink }]}
    >
      <NeoText variant="monoBold" maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={isSelected ? styles.mark : { color: colors.muted }}>
        {isSelected ? '✓' : '-'}
      </NeoText>
    </Pressable>
  );
}

interface DaypartGridProps {
  /** One page of days. */
  dates: string[];
  today: string;
  store: SelectionStore;
  /** Slots that already have as many people as the event allows. */
  fullSlots: ReadonlySet<string>;
}

/** Four tappable parts per day, like the website. There are few enough cells that no drag is needed. */
export function DaypartGrid({ dates, today, store, fullSlots }: DaypartGridProps) {
  const { lang, t } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.dateColumn} />
        {DAY_PART_IDS.map(part => (
          <NeoText key={part} variant="caption" maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={styles.partLabel}>
            {`${t(PART_LABEL_KEYS[part].name)}\n${t(PART_LABEL_KEYS[part].range)}`}
          </NeoText>
        ))}
      </View>
      {dates.map(date => {
        const isPast = date < today;
        return (
          <View key={date} style={styles.row}>
            <NeoText variant="caption" tone={isPast ? 'faint' : 'ink'} maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={[styles.dateColumn, styles.dateLabel]}>
              {dayColumnLabel(date, lang)}
            </NeoText>
            {DAY_PART_IDS.map(part =>
              isPast ? (
                <View key={part} style={[styles.cell, { backgroundColor: colors.sunken, borderColor: colors.lineSoft }]} />
              ) : fullSlots.has(daypartSlotId(date, part)) ? (
                <View
                  key={part}
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${formatLocalizedDate(date, lang, 'chip')} ${t(PART_LABEL_KEYS[part].name)} ${t('slotFullNote')}`}
                  accessibilityState={{ disabled: true, checked: false }}
                  style={[styles.cell, { backgroundColor: colors.sunken, borderColor: colors.lineSoft }]}
                >
                  <NeoText variant="caption" tone="muted" maxFontSizeMultiplier={GRID_LABEL_MAX_SCALE} style={styles.fullTag}>
                    {t('slotFullTag')}
                  </NeoText>
                </View>
              ) : (
                <PartCell
                  key={part}
                  slotId={daypartSlotId(date, part)}
                  label={`${formatLocalizedDate(date, lang, 'chip')} ${t(PART_LABEL_KEYS[part].name)}`}
                  store={store}
                />
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP, alignItems: 'center' },
  dateColumn: { width: DATE_COLUMN_WIDTH },
  dateLabel: { fontSize: 11 },
  partLabel: { flex: 1, textAlign: 'center', fontSize: 11 },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.thin,
  },
  mark: { color: ON_ACCENT },
  fullTag: { fontSize: 10 },
});
