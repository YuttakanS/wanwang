export type DragMode = 'add' | 'remove';

/** The first slot decides the whole gesture: start on a selected slot and it removes. */
export function dragModeFor(selected: readonly string[], slotId: string): DragMode {
  return selected.includes(slotId) ? 'remove' : 'add';
}

/** Returns the same array when nothing changes, so React can skip the update. */
export function applySlot(selected: string[], slotId: string, mode: DragMode): string[] {
  const isSelected = selected.includes(slotId);
  if (mode === 'add') return isSelected ? selected : [...selected, slotId];
  return isSelected ? selected.filter(id => id !== slotId) : selected;
}
