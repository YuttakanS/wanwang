import { useCallback, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { makeMutable, type SharedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { indexesIn, isBitSet, MASK_WORDS, maskOf, withCell, wordOf } from '~/calendar/cellMask';
import { cellIndexAt, cellSizeFor, type GridLayout } from '~/calendar/gridGeometry';
import { lineCells } from '~/calendar/lineCells';
import type { SelectionStore } from '~/calendar/selectionStore';

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

type Mask = SharedValue<number>[];

function newMask(): Mask {
  return Array.from({ length: MASK_WORDS }, () => makeMutable(0));
}

function isInMask(mask: Mask, index: number): boolean {
  'worklet';
  return isBitSet(mask[wordOf(index)].get(), index);
}

function setInMask(mask: Mask, index: number, on: boolean): void {
  'worklet';
  const word = mask[wordOf(index)];
  word.set(withCell(word.get(), index, on));
}

function clearMask(mask: Mask): void {
  'worklet';
  for (let i = 0; i < mask.length; i++) mask[i].set(0);
}

function readMask(mask: Mask): number[] {
  'worklet';
  const words: number[] = [];
  for (let i = 0; i < mask.length; i++) words.push(mask[i].get());
  return words;
}

interface Options {
  /** A slot id per cell, row by row, or null for one that cannot be chosen, such as a past date. */
  cells: (string | null)[];
  store: SelectionStore;
  columns: number;
  gap: number;
  /** A fixed height for each cell. Left out, cells are square. */
  cellHeight?: number;
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
export function useCalendarGesture({ cells, store, columns, gap, cellHeight, outsideVersion, onCellSize, onDraggingChange }: Options) {
  // A fixed number of words, so these can be made once rather than in a loop of hooks.
  const [mask] = useState(newMask);
  const [selectable] = useState(newMask);
  const [touched] = useState(newMask);
  const layout = useSharedValue<GridLayout>({ cellSize: 0, cellHeight: 0, gap, columns, cellCount: cells.length });
  // Written whole from here rather than as an update of the shared value, whose value on this thread
  // can lag the UI thread. An update could otherwise put back a cell size of 0 and leave a dead grid.
  const measured = useRef({ cellSize: 0, cellHeight: 0 });

  const dragMode = useSharedValue(DRAG_NONE);
  const lastCell = useSharedValue(-1);
  const lastHapticAt = useSharedValue(0);

  // Draws from the store only for changes the gestures did not make themselves.
  useEffect(() => {
    const selectableWords = maskOf(index => cells[index] !== null, cells.length);
    const selectedWords = maskOf(index => {
      const slotId = cells[index];
      return slotId !== null && store.has(slotId);
    }, cells.length);

    for (let i = 0; i < MASK_WORDS; i++) {
      selectable[i].set(selectableWords[i]);
      mask[i].set(selectedWords[i]);
    }
    layout.set({ ...measured.current, gap, columns, cellCount: cells.length });
  }, [cells, store, gap, columns, outsideVersion, selectable, mask, layout]);

  // If the grid goes away under a finger, the end of the gesture never arrives to unlock scrolling.
  useEffect(() => () => onDraggingChange(false), [onDraggingChange]);

  const commit = useCallback(
    (words: number[], add: boolean) => {
      const slotIds = indexesIn(words, cells.length)
        .map(index => cells[index])
        .filter((slotId): slotId is string => slotId !== null);
      store.applyFromGesture(slotIds, add);
    },
    [cells, store]
  );

  const paintCell = (index: number, add: boolean) => {
    'worklet';
    if (!isInMask(selectable, index)) return;

    setInMask(touched, index, true);
    if (isInMask(mask, index) === add) return;

    setInMask(mask, index, add);

    const now = Date.now();
    if (now - lastHapticAt.get() >= MIN_HAPTIC_GAP_MS) {
      lastHapticAt.set(now);
      scheduleOnRN(tickHaptic);
    }
  };

  const pan = usePanGesture({
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: event => {
      clearMask(touched);
      scheduleOnRN(onDraggingChange, true);
      scheduleOnRN(startDragHaptic);

      const index = cellIndexAt(event.x, event.y, layout.get());
      lastCell.set(index);
      if (index < 0 || !isInMask(selectable, index)) {
        // Starting on a past date or beside the grid has no cell to decide the mode, so it adds.
        dragMode.set(DRAG_ADD);
        return;
      }

      const add = !isInMask(mask, index);
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
      scheduleOnRN(commit, readMask(touched), mode === DRAG_ADD);
    },
  });

  const tap = useTapGesture({
    onActivate: event => {
      const index = cellIndexAt(event.x, event.y, layout.get());
      if (index < 0 || !isInMask(selectable, index)) return;

      const add = !isInMask(mask, index);
      clearMask(touched);
      lastHapticAt.set(0);
      paintCell(index, add);
      scheduleOnRN(commit, readMask(touched), add);
    },
  });

  // Pan goes first. A quick release makes it fail, which is what lets the tap through.
  const gesture = useExclusiveGestures(pan, tap);

  const onGridLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const size = cellSizeFor(event.nativeEvent.layout.width, columns, gap);
      measured.current = { cellSize: size, cellHeight: cellHeight ?? size };
      layout.set({ ...measured.current, gap, columns, cellCount: cells.length });
      onCellSize(size);
    },
    [columns, gap, cellHeight, cells.length, layout, onCellSize]
  );

  return { gesture, mask, onGridLayout };
}
