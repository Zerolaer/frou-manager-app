/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0B0F14',
          card: 'rgba(255,255,255,0.06)'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        '2xl': '1.25rem'
      }
    },
  },
  plugins: [],
}
