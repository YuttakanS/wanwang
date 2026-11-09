import { describe, expect, it } from 'vitest';
import { applySlot, dragModeFor } from './slotSelection';

describe('dragModeFor', () => {
  it('adds when the first slot is free', () => {
    expect(dragModeFor(['a'], 'b')).toBe('add');
  });

  it('removes when the first slot is selected', () => {
    expect(dragModeFor(['a'], 'a')).toBe('remove');
  });
});

describe('applySlot', () => {
  it('adds a slot once, however often it is applied', () => {
    const once = applySlot([], 'a', 'add');
    const twice = applySlot(once, 'a', 'add');
    expect(twice).toEqual(['a']);
    expect(twice).toBe(once);
  });

  it('removes only the given slot', () => {
    expect(applySlot(['a', 'b'], 'a', 'remove')).toEqual(['b']);
  });

  it('leaves the list alone when removing a slot that is not there', () => {
    const selected = ['a'];
    expect(applySlot(selected, 'b', 'remove')).toBe(selected);
  });

  it('a tap toggles, and a second tap toggles back', () => {
    const afterFirst = applySlot([], 'a', dragModeFor([], 'a'));
    expect(afterFirst).toEqual(['a']);
    expect(applySlot(afterFirst, 'a', dragModeFor(afterFirst, 'a'))).toEqual([]);
  });

  it('a drag that passes over a slot twice does not toggle it back', () => {
    const mode = dragModeFor([], 'a');
    let selected = applySlot([], 'a', mode);
    selected = applySlot(selected, 'b', mode);
    selected = applySlot(selected, 'a', mode);
    expect(selected).toEqual(['a', 'b']);
  });
});
