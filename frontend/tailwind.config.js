/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0F172A',
          raised: '#1E293B',
          overlay: '#334155',
        },
        accent: {
          DEFAULT: '#06B6D4',
          muted: '#0891B2',
          subtle: '#164E63',
        },
        slate: {
          750: '#293548',
        },
        fake: {
          light: '#3B1111',
          DEFAULT: '#EF4444',
          dark: '#FCA5A5',
        },
        real: {
          light: '#052E16',
          DEFAULT: '#22C55E',
          dark: '#86EFAC',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease-out',
        'bar-fill': 'barFill 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        barFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
    },
  },
  plugins: [],
};
