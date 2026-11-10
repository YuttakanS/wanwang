// Same values as the tokens in src/app/globals.css. theme.test.ts fails if the two drift apart.
export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme | 'system';

export interface ThemeColors {
  surface: string;
  ink: string;
  sunken: string;
  sunkenHover: string;
  muted: string;
  faint: string;
  lineSoft: string;
  accent: string;
  onInkAccent: string;
  shadow: string;
  link: string;
  heat1: string;
  onHeat1: string;
  heat2: string;
  onHeat2: string;
  heat3: string;
  onHeat3: string;
}

export const themes: Record<ColorScheme, ThemeColors> = {
  light: {
    surface: '#FFFFFF',
    ink: '#000000',
    sunken: '#F0F0F0',
    sunkenHover: '#E8E8E8',
    muted: '#525252',
    faint: '#A3A3A3',
    lineSoft: '#CCCCCC',
    accent: '#FFE500',
    onInkAccent: '#FFE500',
    shadow: '#000000',
    link: '#0000FF',
    heat1: '#F0F0F0',
    onHeat1: '#000000',
    heat2: '#CCCCCC',
    onHeat2: '#000000',
    heat3: '#525252',
    onHeat3: '#FFFFFF',
  },
  dark: {
    surface: '#111111',
    ink: '#F5F5F5',
    sunken: '#262626',
    sunkenHover: '#333333',
    muted: '#B3B3B3',
    faint: '#737373',
    lineSoft: '#525252',
    accent: '#FFE500',
    onInkAccent: '#000000',
    shadow: '#F5F5F5',
    link: '#8AAAFF',
    heat1: '#333333',
    onHeat1: '#F5F5F5',
    heat2: '#666666',
    onHeat2: '#FFFFFF',
    heat3: '#B3B3B3',
    onHeat3: '#000000',
  },
};

// Yellow stays yellow in both themes, so text and borders on it stay black. RN has no inherited
// colour to reset as the website's .bg-accent rule does, so set this wherever accent is the background.
export const ON_ACCENT = '#000000';

export const borderWidths = { thin: 2, regular: 3, thick: 5 };
export const HARD_SHADOW_OFFSET = 4;

// Grid cells have a fixed size, so their text and the row/column labels beside them grow less than body text.
export const GRID_LABEL_MAX_SCALE = 1.3;

/** Same bands as the website's group view. */
export function heatColors(percentage: number, count: number, colors: ThemeColors): { background: string; text: string } {
  if (count === 0 || percentage === 0) return { background: colors.surface, text: colors.muted };
  if (percentage <= 25) return { background: colors.heat1, text: colors.onHeat1 };
  if (percentage <= 50) return { background: colors.heat2, text: colors.onHeat2 };
  if (percentage <= 75) return { background: colors.heat3, text: colors.onHeat3 };
  return { background: colors.accent, text: ON_ACCENT };
}

export function parseThemePreference(stored: string | null): ThemePreference {
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function resolveColorScheme(preference: ThemePreference, system: ColorScheme | null | undefined): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
