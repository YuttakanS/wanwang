import { describe, expect, it, vi } from 'vitest';
import { SelectionStore } from './selectionStore';

describe('SelectionStore limits', () => {
  const limited = (maxPicks: number | null, blocked: string[] = []) => {
    const store = new SelectionStore();
    const refused = vi.fn();
    store.setLimits({ maxPicks, blocked: new Set(blocked) });
    store.setOnRefused(refused);
    return { store, refused };
  };

  it('stops a gesture at the per-person limit and redraws the calendar', () => {
    const { store, refused } = limited(2);
    const before = store.getOutsideVersion();

    store.applyFromGesture(['a', 'b', 'c'], true);

    expect(store.getSnapshot()).toEqual(['a', 'b']);
    // The gesture drew c on the UI thread, so the grid has to be drawn again from the store.
    expect(store.getOutsideVersion()).toBe(before + 1);
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it('tells listeners about a gesture that was refused outright', () => {
    const { store } = limited(1);
    store.applyFromGesture(['a'], true);
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyFromGesture(['b'], true);

    expect(store.getSnapshot()).toEqual(['a']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not redraw after a gesture that stayed within the limit', () => {
    const { store, refused } = limited(2);
    const before = store.getOutsideVersion();
    store.applyFromGesture(['a', 'b'], true);
    expect(store.getOutsideVersion()).toBe(before);
    expect(refused).not.toHaveBeenCalled();
  });

  it('always lets a slot be removed, and frees its place', () => {
    const { store } = limited(1);
    store.applyFromGesture(['a'], true);
    store.applyFromGesture(['a'], false);
    store.applyFromGesture(['b'], true);
    expect(store.getSnapshot()).toEqual(['b']);
  });

  it('refuses a blocked slot from a gesture, a toggle and a shortcut', () => {
    const { store, refused } = limited(null, ['full']);

    store.applyFromGesture(['full', 'a'], true);
    expect(store.toggle('full')).toBe(false);
    store.addMany(['full', 'b']);

    expect([...store.getSnapshot()].sort()).toEqual(['a', 'b']);
    expect(refused).toHaveBeenCalledTimes(3);
  });

  it('toggle refuses at the limit but still removes', () => {
    const { store } = limited(1);
    expect(store.toggle('a')).toBe(true);
    expect(store.toggle('b')).toBe(false);
    expect(store.toggle('a')).toBe(true);
    expect(store.size).toBe(0);
  });

  it('addMany keeps what is chosen and fills up to the limit in order', () => {
    const { store } = limited(3);
    store.replace(['x']);
    store.addMany(['a', 'x', 'b', 'c']);
    expect(store.getSnapshot()).toEqual(['x', 'a', 'b']);
  });

  it('addMany does nothing visible when there is no room', () => {
    const { store } = limited(1);
    store.replace(['x']);
    const version = store.getVersion();
    store.addMany(['a']);
    expect(store.getVersion()).toBe(version);
  });

  it('shows a saved answer as saved, even over the limit', () => {
    const { store } = limited(1, ['b']);
    store.replace(['a', 'b', 'c']);
    expect(store.size).toBe(3);
  });

  it('has no limits until told', () => {
    const store = new SelectionStore();
    store.addMany(['a', 'b', 'c']);
    expect(store.toggle('d')).toBe(true);
    expect(store.size).toBe(4);
  });
});

describe('SelectionStore', () => {
  it('adds and removes what a gesture reports', () => {
    const store = new SelectionStore();
    store.applyFromGesture(['a', 'b'], true);
    expect([...store.getSnapshot()].sort()).toEqual(['a', 'b']);

    store.applyFromGesture(['a'], false);
    expect(store.has('a')).toBe(false);
    expect(store.has('b')).toBe(true);
    expect(store.size).toBe(1);
  });

  it('keeps one copy of a slot reported twice', () => {
    const store = new SelectionStore();
    store.applyFromGesture(['a', 'a'], true);
    store.applyFromGesture(['a'], true);
    expect(store.getSnapshot()).toEqual(['a']);
  });

  it('does not make the calendar redraw after a gesture', () => {
    const store = new SelectionStore();
    const before = store.getOutsideVersion();
    store.applyFromGesture(['a'], true);
    expect(store.getOutsideVersion()).toBe(before);
    expect(store.getVersion()).toBe(1);
  });

  it('makes the calendar redraw after a change from elsewhere', () => {
    const store = new SelectionStore();
    store.toggle('a');
    expect(store.getOutsideVersion()).toBe(1);
    store.replace(['b']);
    expect(store.getOutsideVersion()).toBe(2);
    expect(store.getSnapshot()).toEqual(['b']);
  });

  it('gives the same array until the selection changes, then a new one', () => {
    const store = new SelectionStore();
    const empty = store.getSnapshot();
    expect(store.getSnapshot()).toBe(empty);

    store.applyFromGesture(['a'], true);
    const afterGesture = store.getSnapshot();
    expect(afterGesture).not.toBe(empty);
    expect(afterGesture).toEqual(['a']);

    store.applyFromGesture(['a'], true);
    expect(store.getSnapshot()).toBe(afterGesture);

    store.toggle('b');
    expect(store.getSnapshot()).toEqual(['a', 'b']);
    store.replace([]);
    expect(store.getSnapshot()).toEqual([]);
    expect(afterGesture).toEqual(['a']);
  });

  it('toggle turns a slot on, then off', () => {
    const store = new SelectionStore();
    store.toggle('a');
    expect(store.has('a')).toBe(true);
    store.toggle('a');
    expect(store.has('a')).toBe(false);
  });

  it('tells listeners only when something changed, until they unsubscribe', () => {
    const store = new SelectionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.applyFromGesture(['a'], true);
    expect(listener).toHaveBeenCalledTimes(1);

    store.applyFromGesture(['a'], true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.applyFromGesture(['b'], true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
