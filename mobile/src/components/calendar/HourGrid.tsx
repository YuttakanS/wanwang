import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { formatLocalizedDate } from '@/lib/timeUtils';
import { wordOf } from '~/calendar/cellMask';
import type { SelectionStore } from '~/calendar/selectionStore';
import { dayColumnLabel, hourCells } from '~/calendar/slotPages';
import { NeoText } from '~/components/neo/NeoText';
import { useCalendarGesture } from '~/hooks/useCalendarGesture';
import { useI18n } from '~/hooks/useI18n';
import { DayCell, DisabledDayCell } from './DayCell';

const GAP = 2;
const CELL_HEIGHT = 34;
const TIME_COLUMN_WIDTH = 44;

interface HourGridProps {
  /** One page of days. The parent changes the key with the page, so each page starts fresh. */
  dates: string[];
  times: string[];
  today: string;
  store: SelectionStore;
  outsideVersion: number;
  onDraggingChange: (dragging: boolean) => void;
}

/** The same engine as DayGrid: tap to toggle, or press and hold then drag across rows and days. */
export function HourGrid({ dates, times, today, store, outsideVersion, onDraggingChange }: HourGridProps) {
  const { lang } = useI18n();
  const [cellWidth, setCellWidth] = useState(0);
  const columns = dates.length;

  const cells = useMemo(() => hourCells(dates, times, today), [dates, times, today]);

  const { gesture, mask, onGridLayout } = useCalendarGesture({
    cells,
    store,
    columns,
    gap: GAP,
    cellHeight: CELL_HEIGHT,
    outsideVersion,
    onCellSize: setCellWidth,
    onDraggingChange,
  });

  const stepX = cellWidth + GAP;
  const stepY = CELL_HEIGHT + GAP;

  return (
    <View style={styles.grid}>
      <View style={styles.headerRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.corner} />
        {dates.map(date => (
          <NeoText key={date} variant="mono" style={styles.dayLabel}>
            {dayColumnLabel(date, lang)}
          </NeoText>
        ))}
      </View>
      <View style={styles.body}>
        <View style={styles.timeColumn} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {times.map(time => (
            <NeoText key={time} variant="mono" style={styles.timeLabel}>
              {time}
            </NeoText>
          ))}
        </View>
        <GestureDetector gesture={gesture}>
          {/* Cells are placed exactly, so they cannot drift from where the touch arithmetic expects them. */}
          <Animated.View onLayout={onGridLayout} style={[styles.cells, { height: times.length * stepY - GAP }]}>
            {cellWidth > 0 &&
              cells.map((slotId, index) => {
                const position = {
                  left: (index % columns) * stepX,
                  top: Math.floor(index / columns) * stepY,
                  width: cellWidth,
                  height: CELL_HEIGHT,
                };
                if (slotId === null) return <DisabledDayCell key={`past-${index}`} position={position} />;
                const [date, time] = slotId.split('T');
                return (
                  <DayCell
                    key={slotId}
                    index={index}
                    slotId={slotId}
                    label={`${formatLocalizedDate(date, lang, 'chip')} ${time}`}
                    position={position}
                    store={store}
                    maskWord={mask[wordOf(index)]}
                  />
                );
              })}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 4 },
  headerRow: { flexDirection: 'row', gap: GAP },
  corner: { width: TIME_COLUMN_WIDTH },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  body: { flexDirection: 'row', gap: GAP },
  timeColumn: { width: TIME_COLUMN_WIDTH, gap: GAP },
  timeLabel: { height: CELL_HEIGHT, lineHeight: CELL_HEIGHT, fontSize: 11 },
  cells: { flex: 1 },
});
