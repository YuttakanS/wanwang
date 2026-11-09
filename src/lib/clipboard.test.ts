// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
}

describe('copyText', () => {
  let copied: (string | undefined)[];

  beforeEach(() => {
    copied = [];
    document.execCommand = vi.fn(() => {
      copied.push((document.activeElement as HTMLTextAreaElement | null)?.value);
      return true;
    });
  });

  afterEach(() => {
    setClipboard(undefined);
    document.body.innerHTML = '';
  });

  it('uses the clipboard API when it works', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyText('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it('falls back when the API is missing, as on plain HTTP', async () => {
    setClipboard(undefined);

    await expect(copyText('hello')).resolves.toBe(true);
    expect(copied).toEqual(['hello']);
  });

  it('falls back when the API rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });

    await expect(copyText('hello')).resolves.toBe(true);
    expect(copied).toEqual(['hello']);
  });

  it('reports failure when the fallback returns false', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn(() => false);

    await expect(copyText('hello')).resolves.toBe(false);
  });

  it('reports failure when the fallback throws', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn(() => {
      throw new Error('not supported');
    });

    await expect(copyText('hello')).resolves.toBe(false);
  });

  it('removes its helper element and restores focus, even on failure', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    setClipboard(undefined);
    document.execCommand = vi.fn(() => {
      throw new Error('not supported');
    });

    await copyText('hello');

    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
