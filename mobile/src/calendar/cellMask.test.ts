import { describe, expect, it } from 'vitest';
import { indexesIn, isBitSet, MASK_WORDS, maskOf, MAX_MASK_CELLS, withCell, wordOf } from './cellMask';

// A week of half-hour slots is the largest page any event can show.
const LARGEST_PAGE = 7 * 48;

describe('cellMask', () => {
  it.each([0, 1, 29, 30, 31, 41, 59, 60, 335])('sets and clears cell %i without touching the others', index => {
    const words = new Array<number>(MASK_WORDS).fill(0);
    words[wordOf(index)] = withCell(0, index, true);

    expect(isBitSet(words[wordOf(index)], index)).toBe(true);
    expect(indexesIn(words, LARGEST_PAGE)).toEqual([index]);
    expect(withCell(words[wordOf(index)], index, false)).toBe(0);
  });

  it('setting a cell twice changes nothing', () => {
    const once = withCell(0, 5, true);
    expect(withCell(once, 5, true)).toBe(once);
  });

  it('clearing a cell that is not set changes nothing', () => {
    const word = withCell(0, 5, true);
    expect(withCell(word, 6, false)).toBe(word);
  });

  it('has room for the largest page', () => {
    expect(MAX_MASK_CELLS).toBeGreaterThanOrEqual(LARGEST_PAGE);
    expect(wordOf(LARGEST_PAGE - 1)).toBeLessThan(MASK_WORDS);
  });

  it.each([42, LARGEST_PAGE])('keeps every cell of a %i-cell grid independent', cellCount => {
    const all = Array.from({ length: cellCount }, (_, index) => index);
    expect(indexesIn(maskOf(() => true, cellCount), cellCount)).toEqual(all);
    expect(indexesIn(maskOf(index => index % 2 === 0, cellCount), cellCount)).toEqual(all.filter(index => index % 2 === 0));
  });

  it('starts empty', () => {
    expect(indexesIn(maskOf(() => false, 42), 42)).toEqual([]);
  });
});
