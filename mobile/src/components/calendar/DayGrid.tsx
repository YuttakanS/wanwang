import { useMemo, useState } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { MonthCell } from '@/lib/monthCells';
import { wordOf } from '~/calendar/cellMask';
import type { SelectionStore } from '~/calendar/selectionStore';
import { useCalendarGesture } from '~/hooks/useCalendarGesture';
import { DayCell, DisabledDayCell } from './DayCell';

const GAP = 4;
const COLUMNS = 7;

interface DayGridProps {
  days: MonthCell[];
  store: SelectionStore;
  outsideVersion: number;
  labelFor: (day: MonthCell) => string;
  /** Days that already have as many people as the event allows. */
  fullSlots: ReadonlySet<string>;
  /** The short tag and the spoken note for a full day. */
  fullText: { tag: string; note: string };
  onDraggingChange: (dragging: boolean) => void;
}

export function DayGrid({ days, store, outsideVersion, labelFor, fullSlots, fullText, onDraggingChange }: DayGridProps) {
  const [cellSize, setCellSize] = useState(0);

  const cells = useMemo(
    () => days.map(day => (day.isInRange && !day.isPast && !fullSlots.has(day.dateStr) ? day.dateStr : null)),
    [days, fullSlots],
  );

  const { gesture, mask, onGridLayout } = useCalendarGesture({
    cells,
    store,
    columns: COLUMNS,
    gap: GAP,
    outsideVersion,
    onCellSize: setCellSize,
    onDraggingChange,
  });

  const rows = Math.ceil(days.length / COLUMNS);
  const step = cellSize + GAP;

  return (
    <GestureDetector gesture={gesture}>
      {/* Cells are placed exactly, so they cannot drift from where the touch arithmetic expects them. */}
      <Animated.View onLayout={onGridLayout} style={{ height: cellSize > 0 ? rows * step - GAP : 0 }}>
        {cellSize > 0 &&
          days.map((day, index) => {
            const position = {
              left: (index % COLUMNS) * step,
              top: Math.floor(index / COLUMNS) * step,
              width: cellSize,
              height: cellSize,
            };
            const slotId = cells[index];
            return slotId === null ? (
              <DisabledDayCell
                key={day.dateStr}
                dayNumber={day.dayNum}
                position={position}
                reason={
                  day.isInRange && !day.isPast && fullSlots.has(day.dateStr)
                    ? { tag: fullText.tag, label: `${labelFor(day)} ${fullText.note}` }
                    : undefined
                }
              />
            ) : (
              <DayCell
                key={day.dateStr}
                index={index}
                slotId={slotId}
                dayNumber={day.dayNum}
                label={labelFor(day)}
                position={position}
                store={store}
                maskWord={mask[wordOf(index)]}
              />
            );
          })}
      </Animated.View>
    </GestureDetector>
  );
}
