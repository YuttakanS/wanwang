import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    borderRadius: {
      none: '0px',
      DEFAULT: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '0px',
    },
    boxShadow: {
      none: 'none',
      hard: '4px 4px 0 rgb(var(--shadow-color))',
      'hard-lg': '6px 6px 0 rgb(var(--shadow-color))',
    },
    extend: {
      // Values for both themes are in globals.css.
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        'sunken-hover': 'rgb(var(--sunken-hover) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        'line-soft': 'rgb(var(--line-soft) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-ink-accent': 'rgb(var(--on-ink-accent) / <alpha-value>)',
        'heat-1': 'rgb(var(--heat-1) / <alpha-value>)',
        'on-heat-1': 'rgb(var(--on-heat-1) / <alpha-value>)',
        'heat-2': 'rgb(var(--heat-2) / <alpha-value>)',
        'on-heat-2': 'rgb(var(--on-heat-2) / <alpha-value>)',
        'heat-3': 'rgb(var(--heat-3) / <alpha-value>)',
        'on-heat-3': 'rgb(var(--on-heat-3) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-plex-thai)', 'sans-serif'],
        // Space Mono has no Thai glyphs, so Thai text falls through to Plex.
        mono: ['var(--font-space-mono)', 'var(--font-plex-thai)', 'monospace'],
      },
      borderWidth: {
        '1': '1px',
        '2': '2px',
        '3': '3px',
        '5': '5px',
      },
      letterSpacing: {
        raw: '1px',
        chip: '0.5px',
      },
      lineHeight: {
        thai: '1.65',
      },
    },
  },
  plugins: [],
} satisfies Config;
