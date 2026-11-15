import { SIGN_DEFAULT_COLOR } from '@/types';

/** LEDs from top to bottom. Tall enough for Thai with a vowel and a tone mark stacked above. */
export const LED_ROWS = 28;
/** The sign's own colours. It is a dark panel in both themes, like the real thing. */
export const LED_PANEL_COLOR = '#0a0a0a';
export const LED_OFF_COLOR = '#262626';
/** Columns the text moves per second. */
export const LED_SPEED = 30;

/** WCAG's bar for text. Under it, lit LEDs are hard to tell from unlit ones. */
const MIN_CONTRAST = 4.5;

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

const PANEL_LUMINANCE = luminance(parseHex(LED_PANEL_COLOR)!);

/**
 * The colour the lit LEDs get. A colour too dark to read on the panel (black, navy) is mixed with
 * white until it can be read, which keeps its hue. Anything that is not a colour gives the default.
 */
export function ledColor(hex: string): string {
  const rgb = parseHex(hex) ?? parseHex(SIGN_DEFAULT_COLOR)!;
  for (let mix = 0; mix <= 1; mix += 0.05) {
    const lifted = rgb.map(c => Math.round(c + (255 - c) * mix)) as [number, number, number];
    if ((luminance(lifted) + 0.05) / (PANEL_LUMINANCE + 0.05) >= MIN_CONTRAST) {
      return `#${lifted.map(c => c.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return '#ffffff';
}

/**
 * Columns from the start of the text to the start of its next pass. The gap is as wide as the
 * sign, so the text leaves completely before it comes in again from the right.
 */
export function stripColumns(textCols: number, viewCols: number): number {
  return textCols + viewCols;
}

/** The columns, counted from the sign's left edge, at which a copy of the text starts. */
export function copyStarts(offset: number, stripCols: number, viewCols: number): number[] {
  const starts: number[] = [];
  for (let x = 0 - (offset % stripCols); x < viewCols; x += stripCols) starts.push(x);
  return starts;
}
