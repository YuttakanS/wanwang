import { useState, useSyncExternalStore } from 'react';
import { SelectionStore } from '~/calendar/selectionStore';

export function useSelectionStore() {
  const [store] = useState(() => new SelectionStore());
  // Render from `slots`. The compiler caches by reference and `store` never changes, so a value
  // read through a store method, such as a list built from it, would go stale on screen.
  const slots = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const outsideVersion = useSyncExternalStore(store.subscribe, store.getOutsideVersion);
  return { store, slots, outsideVersion };
}

/** Re-renders only when this one slot changes. Screen readers read the value from React. */
export function useIsSlotSelected(store: SelectionStore, slotId: string): boolean {
  return useSyncExternalStore(store.subscribe, () => store.has(slotId));
}
