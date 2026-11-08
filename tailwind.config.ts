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
      hard: '4px 4px 0 #000000',
      'hard-lg': '6px 6px 0 #000000',
    },
    extend: {
      colors: {
        raw: {
          black: '#000000',
          white: '#FFFFFF',
          yellow: '#FFE500', // Single Accent Yellow
          sunken: '#F0F0F0',
          hover: '#E8E8E8',
          border: '#CCCCCC',
          muted: '#525252',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
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
