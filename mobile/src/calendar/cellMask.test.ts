import { describe, expect, it } from 'vitest';
import { indexesIn, isCellSet, isLowWord, maskOf, withCell } from './cellMask';

describe('cellMask', () => {
  it.each([0, 1, 29, 30, 31, 41])('sets and clears cell %i without touching the others', index => {
    const word = withCell(0, index, true);
    const { low, high } = isLowWord(index) ? { low: word, high: 0 } : { low: 0, high: word };

    expect(isCellSet(low, high, index)).toBe(true);
    expect(indexesIn(low, high, 42)).toEqual([index]);

    const cleared = withCell(word, index, false);
    expect(cleared).toBe(0);
  });

  it('setting a cell twice changes nothing', () => {
    const once = withCell(0, 5, true);
    expect(withCell(once, 5, true)).toBe(once);
  });

  it('clearing a cell that is not set changes nothing', () => {
    const word = withCell(0, 5, true);
    expect(withCell(word, 6, false)).toBe(word);
  });

  it('keeps every cell of a 42-cell month independent', () => {
    const all = Array.from({ length: 42 }, (_, index) => index);
    const { low, high } = maskOf(() => true, 42);
    expect(indexesIn(low, high, 42)).toEqual(all);

    const evens = maskOf(index => index % 2 === 0, 42);
    expect(indexesIn(evens.low, evens.high, 42)).toEqual(all.filter(index => index % 2 === 0));
  });

  it('starts empty', () => {
    const { low, high } = maskOf(() => false, 42);
    expect(indexesIn(low, high, 42)).toEqual([]);
  });
});
