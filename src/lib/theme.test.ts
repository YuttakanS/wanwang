// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_INIT_SCRIPT, getActiveTheme, getStoredTheme, saveTheme } from './theme';

function mockSystemTheme(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark }) as unknown as typeof window.matchMedia;
}

function runInitScript() {
  new Function(THEME_INIT_SCRIPT)();
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows the system when nothing was chosen', () => {
    mockSystemTheme(true);
    expect(getActiveTheme()).toBe('dark');
    mockSystemTheme(false);
    expect(getActiveTheme()).toBe('light');
  });

  it('a saved choice beats the system', () => {
    mockSystemTheme(true);
    saveTheme('light');
    expect(getActiveTheme()).toBe('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('the init script applies a saved choice', () => {
    saveTheme('dark');
    delete document.documentElement.dataset.theme;
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('the init script leaves the system setting in charge when nothing was chosen', () => {
    runInitScript();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem('wanwang_theme', 'purple');
    expect(getStoredTheme()).toBeNull();
    runInitScript();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  describe('when storage is blocked', () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
    });

    it('nothing throws, and the choice still applies to this page', () => {
      expect(() => runInitScript()).not.toThrow();
      expect(getStoredTheme()).toBeNull();
      expect(() => saveTheme('dark')).not.toThrow();
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });
});
