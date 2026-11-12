import { useMemo } from 'react';
import { fullSlotsFor } from '@/lib/slotLimits';
import type { Participant } from '@/types';

/**
 * Slots with as many people as the event allows. One already in my saved answer is never full for me.
 * The same Set until the answers change, because the calendar grids rebuild their cells from it.
 */
export function useFullSlots(participants: Participant[], myId: string | null, maxPerSlot: number | null): ReadonlySet<string> {
  return useMemo(() => fullSlotsFor(participants, myId, maxPerSlot), [participants, myId, maxPerSlot]);
}
