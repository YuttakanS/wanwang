// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startVisibleRefresh } from './visibleRefresh';

let visibility: DocumentVisibilityState = 'visible';

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('startVisibleRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes on an interval while visible', () => {
    const refresh = vi.fn();
    const stop = startVisibleRefresh(refresh, 1000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(3);
    stop();
  });

  it('does nothing while hidden and refreshes at once when shown again', () => {
    const refresh = vi.fn();
    const stop = startVisibleRefresh(refresh, 1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(5000);
    expect(refresh).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(refresh).toHaveBeenCalledTimes(1);
    // The interval restarts from the moment it was shown, so no second call right after.
    vi.advanceTimersByTime(999);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
  });

  it('starts without a timer when the page loads hidden', () => {
    visibility = 'hidden';
    const refresh = vi.fn();
    const stop = startVisibleRefresh(refresh, 1000);
    vi.advanceTimersByTime(5000);
    expect(refresh).not.toHaveBeenCalled();
    stop();
  });

  it('stops everything when stopped', () => {
    const refresh = vi.fn();
    const stop = startVisibleRefresh(refresh, 1000);
    stop();
    vi.advanceTimersByTime(5000);
    setVisibility('hidden');
    setVisibility('visible');
    expect(refresh).not.toHaveBeenCalled();
  });
});
