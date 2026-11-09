/**
 * Every cell on the straight line between two cells, excluding the start and including the end.
 * A fast finger jumps several cells between touch events, and this fills in the ones it skipped.
 */
export function lineCells(from: number, to: number, columns: number): number[] {
  'worklet';
  if (from === to) return [];

  let column = from % columns;
  let row = Math.floor(from / columns);
  const endColumn = to % columns;
  const endRow = Math.floor(to / columns);

  const deltaColumn = Math.abs(endColumn - column);
  const deltaRow = -Math.abs(endRow - row);
  const stepColumn = column < endColumn ? 1 : -1;
  const stepRow = row < endRow ? 1 : -1;
  let error = deltaColumn + deltaRow;

  const cells: number[] = [];
  while (column !== endColumn || row !== endRow) {
    const doubled = 2 * error;
    if (doubled >= deltaRow) {
      error += deltaRow;
      column += stepColumn;
    }
    if (doubled <= deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
    cells.push(row * columns + column);
  }
  return cells;
}
