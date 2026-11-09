function copyWithSelection(text: string): boolean {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true; // Keeps the on-screen keyboard closed on phones.
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.fontSize = '16px'; // iOS zooms the page on focusing smaller text.
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    previouslyFocused?.focus?.();
  }
}

/**
 * Returns false if nothing was copied, so the caller can offer the text to copy by hand.
 * navigator.clipboard is undefined outside HTTPS and localhost, and can reject when denied.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older copy method.
  }
  return copyWithSelection(text);
}
