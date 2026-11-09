/**
 * The cells of one month as bits in two numbers, so the UI thread can read and write them in O(1)
 * without allocating during a drag. A month has at most 42 cells, and bitwise operators only work
 * on 32 bits, so the cells are split across a low and a high word.
 */
const BITS_PER_WORD = 30;

export function isLowWord(index: number): boolean {
  'worklet';
  return index < BITS_PER_WORD;
}

export function isCellSet(low: number, high: number, index: number): boolean {
  'worklet';
  const word = index < BITS_PER_WORD ? low : high;
  return ((word >>> index % BITS_PER_WORD) & 1) === 1;
}

/** Returns the new value of the word this cell belongs to. */
export function withCell(word: number, index: number, on: boolean): number {
  'worklet';
  const bit = 1 << index % BITS_PER_WORD;
  return on ? word | bit : word & ~bit;
}

export function maskOf(isSet: (index: number) => boolean, cellCount: number): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (let index = 0; index < cellCount; index++) {
    if (!isSet(index)) continue;
    if (isLowWord(index)) low = withCell(low, index, true);
    else high = withCell(high, index, true);
  }
  return { low, high };
}

export function indexesIn(low: number, high: number, cellCount: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < cellCount; index++) {
    if (isCellSet(low, high, index)) indexes.push(index);
  }
  return indexes;
}
