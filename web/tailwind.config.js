/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#FFCC00',
          'primary-hover': '#E6B800',
          'primary-light': '#FFF9E6',
          gold: '#FFCC00',
          dark: '#1A1A1A',
          red: '#B91C1C',
        },
        neutral: {
          'bg-canvas': '#F8F9FA',
          surface: '#FFFFFF',
          'text-main': '#1A1A1A',
          'text-muted': '#71717A',
          border: '#E4E4E7',
        },
        semantic: {
          'success-bg': '#DCFCE7',
          'success-text': '#15803D',
          'error-bg': '#FEE2E2',
          'error-text': '#B91C1C',
          'info-bg': '#EFF6FF',
          'info-text': '#1D4ED8',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'bottom-nav': '0 -4px 16px rgba(0, 0, 0, 0.08)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
