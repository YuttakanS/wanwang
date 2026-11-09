import { useCallback, useEffect } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { indexesIn, isCellSet, isLowWord, maskOf, withCell } from '~/calendar/cellMask';
import { cellIndexAt, cellSizeFor, type GridLayout } from '~/calendar/gridGeometry';
import { lineCells } from '~/calendar/lineCells';
import type { SelectionStore } from '~/calendar/selectionStore';

const COLUMNS = 7;
// Long enough that a scroll starting on the calendar gets away before a drag can begin.
const LONG_PRESS_MS = 180;
const MIN_HAPTIC_GAP_MS = 40;

const DRAG_NONE = 0;
const DRAG_ADD = 1;
const DRAG_REMOVE = 2;

function tickHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

function startDragHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

interface Options {
  /** A slot id per cell, or null for one that cannot be chosen, such as a past date. */
  cells: (string | null)[];
  store: SelectionStore;
  gap: number;
  outsideVersion: number;
  onCellSize: (size: number) => void;
  /** Lets the screen stop scrolling while a finger is dragging across the grid. */
  onDraggingChange: (dragging: boolean) => void;
}

/**
 * Tap to toggle, or press and hold then drag to select many. Exactly one gesture changes a cell per
 * touch, so a tap cannot toggle twice. While dragging, cells are drawn from the UI thread without
 * involving React, and the store gets the result when the finger lifts.
 */
export function useCalendarGesture({ cells, store, gap, outsideVersion, onCellSize, onDraggingChange }: Options) {
  const maskLow = useSharedValue(0);
  const maskHigh = useSharedValue(0);
  const selectableLow = useSharedValue(0);
  const selectableHigh = useSharedValue(0);
  const layout = useSharedValue<GridLayout>({ cellSize: 0, gap, columns: COLUMNS, cellCount: cells.length });

  const dragMode = useSharedValue(DRAG_NONE);
  const lastCell = useSharedValue(-1);
  const touchedLow = useSharedValue(0);
  const touchedHigh = useSharedValue(0);
  const lastHapticAt = useSharedValue(0);

  // Draws from the store only for changes the gestures did not make themselves.
  useEffect(() => {
    const selectable = maskOf(index => cells[index] !== null, cells.length);
    const selected = maskOf(index => {
      const slotId = cells[index];
      return slotId !== null && store.has(slotId);
    }, cells.length);

    selectableLow.set(selectable.low);
    selectableHigh.set(selectable.high);
    maskLow.set(selected.low);
    maskHigh.set(selected.high);
    layout.set(current => ({ ...current, gap, cellCount: cells.length }));
  }, [cells, store, gap, outsideVersion, selectableLow, selectableHigh, maskLow, maskHigh, layout]);

  const commit = useCallback(
    (low: number, high: number, add: boolean) => {
      const slotIds = indexesIn(low, high, cells.length)
        .map(index => cells[index])
        .filter((slotId): slotId is string => slotId !== null);
      store.applyFromGesture(slotIds, add);
    },
    [cells, store]
  );

  const paintCell = (index: number, add: boolean) => {
    'worklet';
    if (!isCellSet(selectableLow.get(), selectableHigh.get(), index)) return;

    const low = isLowWord(index);
    if (low) touchedLow.set(withCell(touchedLow.get(), index, true));
    else touchedHigh.set(withCell(touchedHigh.get(), index, true));

    if (isCellSet(maskLow.get(), maskHigh.get(), index) === add) return;

    if (low) maskLow.set(withCell(maskLow.get(), index, add));
    else maskHigh.set(withCell(maskHigh.get(), index, add));

    const now = Date.now();
    if (now - lastHapticAt.get() >= MIN_HAPTIC_GAP_MS) {
      lastHapticAt.set(now);
      scheduleOnRN(tickHaptic);
    }
  };

  const pan = usePanGesture({
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: event => {
      touchedLow.set(0);
      touchedHigh.set(0);
      scheduleOnRN(onDraggingChange, true);
      scheduleOnRN(startDragHaptic);

      const index = cellIndexAt(event.x, event.y, layout.get());
      lastCell.set(index);
      if (index < 0 || !isCellSet(selectableLow.get(), selectableHigh.get(), index)) {
        // Starting on a past date or beside the grid has no cell to decide the mode, so it adds.
        dragMode.set(DRAG_ADD);
        return;
      }

      const add = !isCellSet(maskLow.get(), maskHigh.get(), index);
      dragMode.set(add ? DRAG_ADD : DRAG_REMOVE);
      paintCell(index, add);
    },
    onUpdate: event => {
      if (dragMode.get() === DRAG_NONE) return;

      const index = cellIndexAt(event.x, event.y, layout.get());
      if (index < 0 || index === lastCell.get()) return;

      const add = dragMode.get() === DRAG_ADD;
      const previous = lastCell.get();
      if (previous < 0) {
        paintCell(index, add);
      } else {
        const crossed = lineCells(previous, index, layout.get().columns);
        for (let i = 0; i < crossed.length; i++) paintCell(crossed[i], add);
      }
      lastCell.set(index);
    },
    onFinalize: () => {
      const mode = dragMode.get();
      if (mode === DRAG_NONE) return;

      dragMode.set(DRAG_NONE);
      lastCell.set(-1);
      scheduleOnRN(onDraggingChange, false);
      scheduleOnRN(commit, touchedLow.get(), touchedHigh.get(), mode === DRAG_ADD);
    },
  });

  const tap = useTapGesture({
    onActivate: event => {
      const index = cellIndexAt(event.x, event.y, layout.get());
      if (index < 0 || !isCellSet(selectableLow.get(), selectableHigh.get(), index)) return;

      const add = !isCellSet(maskLow.get(), maskHigh.get(), index);
      touchedLow.set(0);
      touchedHigh.set(0);
      lastHapticAt.set(0);
      paintCell(index, add);
      scheduleOnRN(commit, touchedLow.get(), touchedHigh.get(), add);
    },
  });

  // Pan goes first. A quick release makes it fail, which is what lets the tap through.
  const gesture = useExclusiveGestures(pan, tap);

  const onGridLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const size = cellSizeFor(event.nativeEvent.layout.width, COLUMNS, gap);
      layout.set(current => ({ ...current, cellSize: size }));
      onCellSize(size);
    },
    [gap, layout, onCellSize]
  );

  return { gesture, maskLow, maskHigh, onGridLayout };
}
