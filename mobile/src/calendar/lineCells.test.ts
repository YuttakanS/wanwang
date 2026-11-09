import { describe, expect, it } from 'vitest';
import { lineCells } from './lineCells';

describe('lineCells', () => {
  it('returns nothing when the finger has not changed cell', () => {
    expect(lineCells(3, 3, 7)).toEqual([]);
  });

  it('returns just the end for a neighbouring cell', () => {
    expect(lineCells(3, 4, 7)).toEqual([4]);
  });

  it('fills a row in either direction', () => {
    expect(lineCells(0, 3, 7)).toEqual([1, 2, 3]);
    expect(lineCells(3, 0, 7)).toEqual([2, 1, 0]);
  });

  it('fills a column', () => {
    expect(lineCells(1, 22, 7)).toEqual([8, 15, 22]);
  });

  it('fills a diagonal', () => {
    expect(lineCells(0, 16, 7)).toEqual([8, 16]);
  });

  it('always ends on the target and never repeats a cell', () => {
    for (const [from, to] of [[0, 34], [34, 0], [6, 28], [10, 13], [2, 40]]) {
      const cells = lineCells(from, to, 7);
      expect(cells.at(-1)).toBe(to);
      expect(new Set(cells).size).toBe(cells.length);
      expect(cells).not.toContain(from);
    }
  });
});
