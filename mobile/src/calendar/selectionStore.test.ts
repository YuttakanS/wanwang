import { describe, expect, it, vi } from 'vitest';
import { SelectionStore } from './selectionStore';

describe('SelectionStore', () => {
  it('adds and removes what a gesture reports', () => {
    const store = new SelectionStore();
    store.applyFromGesture(['a', 'b'], true);
    expect(store.toArray().sort()).toEqual(['a', 'b']);

    store.applyFromGesture(['a'], false);
    expect(store.has('a')).toBe(false);
    expect(store.has('b')).toBe(true);
    expect(store.size).toBe(1);
  });

  it('keeps one copy of a slot reported twice', () => {
    const store = new SelectionStore();
    store.applyFromGesture(['a', 'a'], true);
    store.applyFromGesture(['a'], true);
    expect(store.toArray()).toEqual(['a']);
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
    expect(store.toArray()).toEqual(['b']);
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
