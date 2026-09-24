import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        ink: '#14213D',
        route: '#2F6F6B',
        'route-dark': '#204B48',
        amber: '#E1A93A',
        clay: '#C1502E',
        slate: '#6B7280',
        'slate-light': '#E4E1DA',
        card: '#FFFFFF',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
