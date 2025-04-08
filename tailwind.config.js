/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      animation: {
        popIn: 'popIn 0.6s ease-out forwards'
      },
      keyframes: {
        popIn: {
          '0%': { opacity: 0, transform: 'scale(0.8)' },
          '50%': { opacity: 1, transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: [],
}