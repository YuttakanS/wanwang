import { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction, useCallback, useEffect, useMemo, useRef } from 'react';
import { DragMode, applySlot, dragModeFor } from '@/lib/slotSelection';

// Finger movement under this is still a tap, since fingers wobble.
const TAP_SLOP_PX = 8;

interface ActiveDrag {
  pointerId: number;
  mode: DragMode;
  startX: number;
  startY: number;
  // The axis the grid leaves to the browser for scrolling, from its touch-action.
  scrollAxis: 'x' | 'y' | null;
  // A finger may be starting to scroll, so its first slot waits until that is ruled out.
  pendingSlot: string | null;
}

function slotAt(x: number, y: number): string | null {
  const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot-id]');
  return cell?.dataset.slotId ?? null;
}

function scrollAxisOf(grid: Element): ActiveDrag['scrollAxis'] {
  const touchAction = getComputedStyle(grid).touchAction;
  if (touchAction.includes('pan-y')) return 'y';
  if (touchAction.includes('pan-x')) return 'x';
  return null;
}

/**
 * Tap, click and drag selection for a grid of [data-slot-id] cells.
 *
 * Pointer events are the only input here: listening to touch and mouse together made a tap toggle
 * twice, because a phone also sends mousedown after touchend. The handlers sit on the grid rather
 * than on each cell, since a long hourly event can have thousands of cells.
 */
export function useSlotDragSelect(
  selected: string[],
  setSelected: Dispatch<SetStateAction<string[]>>
) {
  const dragRef = useRef<ActiveDrag | null>(null);
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const apply = useCallback(
    (slotId: string, mode: DragMode) => setSelected(prev => applySlot(prev, slotId, mode)),
    [setSelected]
  );

  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (drag.pendingSlot) apply(drag.pendingSlot, drag.mode);
      dragRef.current = null;
    };
    // The browser took this touch to scroll the page, so it was never a selection.
    const handlePointerCancel = (e: PointerEvent) => {
      if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [apply]);

  return useMemo(
    () => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (!e.isPrimary || e.button !== 0) return;
        const slotId = (e.target as Element).closest<HTMLElement>('[data-slot-id]')?.dataset.slotId;
        if (!slotId) return;

        const mode = dragModeFor(selectedRef.current, slotId);
        const isTouch = e.pointerType === 'touch';
        dragRef.current = {
          pointerId: e.pointerId,
          mode,
          startX: e.clientX,
          startY: e.clientY,
          scrollAxis: isTouch ? scrollAxisOf(e.currentTarget) : null,
          pendingSlot: isTouch ? slotId : null,
        };
        if (!isTouch) apply(slotId, mode);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;

        if (drag.pendingSlot) {
          const dx = Math.abs(e.clientX - drag.startX);
          const dy = Math.abs(e.clientY - drag.startY);
          if (Math.max(dx, dy) < TAP_SLOP_PX) return;

          // Moves arrive before the browser's pointercancel, so scrolling must be spotted here.
          const isScrolling = drag.scrollAxis === 'y' ? dy >= dx : drag.scrollAxis === 'x' ? dx >= dy : false;
          if (isScrolling) {
            dragRef.current = null;
            return;
          }

          apply(drag.pendingSlot, drag.mode);
          drag.pendingSlot = null;
        }

        const slotId = slotAt(e.clientX, e.clientY);
        if (slotId) apply(slotId, drag.mode);
      },
    }),
    [apply]
  );
}
