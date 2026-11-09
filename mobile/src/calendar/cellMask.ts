/**
 * The cells of one grid as bits across several numbers, so the UI thread can read and write them in
 * O(1) without allocating during a drag. Bitwise operators only work on 32 bits, so the cells are
 * split into words. A cell only has to watch its own word, so a change redraws at most one word's
 * worth of cells however large the grid is.
 */
const BITS_PER_WORD = 30;

/** Enough for the largest page: 7 days of half-hour slots is 336 cells. */
export const MASK_WORDS = 12;
export const MAX_MASK_CELLS = MASK_WORDS * BITS_PER_WORD;

export function wordOf(index: number): number {
  'worklet';
  return Math.floor(index / BITS_PER_WORD);
}

export function isBitSet(word: number, index: number): boolean {
  'worklet';
  return ((word >>> index % BITS_PER_WORD) & 1) === 1;
}

/** Returns the new value of the word this cell belongs to. */
export function withCell(word: number, index: number, on: boolean): number {
  'worklet';
  const bit = 1 << index % BITS_PER_WORD;
  return on ? word | bit : word & ~bit;
}

export function maskOf(isSet: (index: number) => boolean, cellCount: number): number[] {
  const words = new Array<number>(MASK_WORDS).fill(0);
  for (let index = 0; index < cellCount; index++) {
    if (isSet(index)) words[wordOf(index)] = withCell(words[wordOf(index)], index, true);
  }
  return words;
}

export function indexesIn(words: readonly number[], cellCount: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < cellCount; index++) {
    if (isBitSet(words[wordOf(index)], index)) indexes.push(index);
  }
  return indexes;
}
