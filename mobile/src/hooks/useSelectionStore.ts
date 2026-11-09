import { useState, useSyncExternalStore } from 'react';
import { SelectionStore } from '~/calendar/selectionStore';

export function useSelectionStore() {
  const [store] = useState(() => new SelectionStore());
  useSyncExternalStore(store.subscribe, store.getVersion);
  const outsideVersion = useSyncExternalStore(store.subscribe, store.getOutsideVersion);
  return { store, outsideVersion };
}

/** Re-renders only when this one slot changes. Screen readers read the value from React. */
export function useIsSlotSelected(store: SelectionStore, slotId: string): boolean {
  return useSyncExternalStore(store.subscribe, () => store.has(slotId));
}
