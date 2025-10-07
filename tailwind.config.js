/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1a1a1a',
          foreground: '#ffffff',
        },
        base: {
          bg: '#0B0F14',
          card: 'rgba(255,255,255,0.06)'
        }
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
        '4xl': '80px',
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        '2xl': '1.25rem'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-50%) translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(-50%) translateX(0)' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
  },
  plugins: [],
}
