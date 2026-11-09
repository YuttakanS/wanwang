import { describe, expect, it } from 'vitest';
import { cellIndexAt, cellSizeFor, type GridLayout } from './gridGeometry';

// 7 columns of 40 with a gap of 4: columns start at 0, 44, 88 and so on.
const layout: GridLayout = { cellSize: 40, cellHeight: 40, gap: 4, columns: 7, cellCount: 35 };

describe('cellSizeFor', () => {
  it('leaves room for the gaps', () => {
    expect(cellSizeFor(304, 7, 4)).toBe(40);
  });
});

describe('cellIndexAt', () => {
  it('finds cells by column and row', () => {
    expect(cellIndexAt(20, 20, layout)).toBe(0);
    expect(cellIndexAt(64, 20, layout)).toBe(1);
    expect(cellIndexAt(20, 64, layout)).toBe(7);
    expect(cellIndexAt(300, 190, layout)).toBe(34);
  });

  it('gives a touch in a gap to the nearest cell', () => {
    expect(cellIndexAt(41, 20, layout)).toBe(0);
    expect(cellIndexAt(43, 20, layout)).toBe(1);
  });

  it('accepts the very edges of the grid', () => {
    expect(cellIndexAt(0, 0, layout)).toBe(0);
    expect(cellIndexAt(304, 216, layout)).toBe(34);
  });

  it('returns -1 outside the grid', () => {
    expect(cellIndexAt(-1, 20, layout)).toBe(-1);
    expect(cellIndexAt(20, -1, layout)).toBe(-1);
    expect(cellIndexAt(305, 20, layout)).toBe(-1);
    expect(cellIndexAt(20, 217, layout)).toBe(-1);
  });

  it('returns -1 past the last cell of a short last row', () => {
    const short = { ...layout, cellCount: 30 };
    expect(cellIndexAt(64, 196, short)).toBe(29);
    expect(cellIndexAt(108, 196, short)).toBe(-1);
  });

  it('returns -1 before the grid has been measured', () => {
    expect(cellIndexAt(10, 10, { ...layout, cellSize: 0 })).toBe(-1);
    expect(cellIndexAt(10, 10, { ...layout, cellHeight: 0 })).toBe(-1);
  });

  it('handles cells wider than they are tall', () => {
    const wide = { ...layout, cellHeight: 20, cellCount: 28 };
    expect(cellIndexAt(64, 10, wide)).toBe(1);
    expect(cellIndexAt(64, 34, wide)).toBe(8);
    expect(cellIndexAt(300, 90, wide)).toBe(27);
    expect(cellIndexAt(300, 95, wide)).toBe(-1);
  });
});
