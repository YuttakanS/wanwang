import { useMemo, useState } from 'react';
import { fullSlotsFor, sameSlots } from '@/lib/slotLimits';
import type { Participant } from '@/types';

const NONE: ReadonlySet<string> = new Set();

/**
 * Slots with as many people as the event allows. One already in my saved answer is never full for me.
 *
 * The same Set object is handed back for as long as its members are the same. The calendar grids
 * rebuild their cells from it and then redraw from the store, which wipes whatever a finger is in
 * the middle of drawing, and a refetch brings a new list of participants every time anyone answers.
 */
export function useFullSlots(participants: Participant[], myId: string | null, maxPerSlot: number | null): ReadonlySet<string> {
  const computed = useMemo(
    () => (maxPerSlot ? fullSlotsFor(participants, myId, maxPerSlot) : NONE),
    [participants, myId, maxPerSlot],
  );
  const [kept, setKept] = useState(computed);
  if (computed !== kept && !sameSlots(computed, kept)) {
    setKept(computed);
    return computed;
  }
  return kept;
}
