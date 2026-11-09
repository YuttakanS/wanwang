import { describe, expect, it } from 'vitest';
import css from '../../../src/app/globals.css?raw';
import { ON_ACCENT, parseThemePreference, resolveColorScheme, themes, type ThemeColors } from './theme';

const CSS_TOKENS: Record<keyof ThemeColors, string> = {
  surface: 'surface',
  ink: 'ink',
  sunken: 'sunken',
  sunkenHover: 'sunken-hover',
  muted: 'muted',
  faint: 'faint',
  lineSoft: 'line-soft',
  accent: 'accent',
  onInkAccent: 'on-ink-accent',
  shadow: 'shadow-color',
  link: 'link',
  heat1: 'heat-1',
  onHeat1: 'on-heat-1',
  heat2: 'heat-2',
  onHeat2: 'on-heat-2',
  heat3: 'heat-3',
  onHeat3: 'on-heat-3',
};

function cssBlock(selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`${selector} is missing from globals.css`);
  return css.slice(start, css.indexOf('}', start));
}

function cssColor(block: string, token: string): string | null {
  const match = block.match(new RegExp(`--${token}: (\\d+) (\\d+) (\\d+);`));
  if (!match) return null;
  const hex = match.slice(1, 4).map(value => Number(value).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`.toUpperCase();
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map(start => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme tokens', () => {
  const lightBlock = cssBlock(':root {');
  const darkBlock = cssBlock(":root[data-theme='dark'] {");

  it.each(Object.entries(CSS_TOKENS))('%s matches globals.css in both themes', (key, token) => {
    const colorKey = key as keyof ThemeColors;
    const light = cssColor(lightBlock, token);
    expect(themes.light[colorKey]).toBe(light);
    // The dark block leaves out tokens that do not change between themes.
    expect(themes.dark[colorKey]).toBe(cssColor(darkBlock, token) ?? light);
  });

  it.each(['light', 'dark'] as const)('main colour pairs reach 4.5:1 in %s', scheme => {
    const colors = themes[scheme];
    const pairs: [string, string][] = [
      [colors.ink, colors.surface],
      [colors.ink, colors.sunken],
      [colors.ink, colors.sunkenHover],
      [colors.muted, colors.surface],
      [colors.muted, colors.sunken],
      [colors.link, colors.surface],
      [ON_ACCENT, colors.accent],
      [colors.onInkAccent, colors.ink],
      [colors.surface, colors.ink],
      [colors.onHeat1, colors.heat1],
      [colors.onHeat2, colors.heat2],
      [colors.onHeat3, colors.heat3],
    ];
    for (const [text, background] of pairs) {
      expect(contrast(text, background), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('theme preference', () => {
  it('keeps a saved choice and treats anything else as following the system', () => {
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('system')).toBe('system');
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('blue')).toBe('system');
  });

  it('prefers the saved choice over the system', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });

  it('follows the system, and uses light when the system gives no answer', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('system', undefined)).toBe('light');
  });
});
