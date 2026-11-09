export interface GridLayout {
  cellSize: number;
  gap: number;
  columns: number;
  cellCount: number;
}

export function cellSizeFor(width: number, columns: number, gap: number): number {
  return (width - gap * (columns - 1)) / columns;
}

/**
 * Which cell a touch inside the grid hits, or -1 outside it. This is arithmetic instead of measuring
 * each cell, so it can run on the UI thread for every finger movement. A touch in the gap between
 * two cells counts as the nearest one, because fingers are not that precise.
 */
export function cellIndexAt(x: number, y: number, layout: GridLayout): number {
  'worklet';
  const { cellSize, gap, columns, cellCount } = layout;
  if (cellSize <= 0 || cellCount <= 0) return -1;

  const step = cellSize + gap;
  const rows = Math.ceil(cellCount / columns);
  if (x < 0 || y < 0 || x > step * columns - gap || y > step * rows - gap) return -1;

  const column = Math.min(columns - 1, Math.floor((x + gap / 2) / step));
  const row = Math.min(rows - 1, Math.floor((y + gap / 2) / step));
  const index = row * columns + column;
  return index < cellCount ? index : -1;
}
