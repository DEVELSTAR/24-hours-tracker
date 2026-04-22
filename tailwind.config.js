/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        sleep: { bg: '#1e3a5f', text: '#ffffff', border: '#2d5a87' },
        work: { bg: '#065f46', text: '#ffffff', border: '#047857' },
        eat: { bg: '#92400e', text: '#ffffff', border: '#b45309' },
        exercise: { bg: '#991b1b', text: '#ffffff', border: '#b91c1c' },
        leisure: { bg: '#3730a3', text: '#ffffff', border: '#4338ca' },
        learning: { bg: '#0e7490', text: '#ffffff', border: '#06b6d4' },
        social: { bg: '#be185d', text: '#ffffff', border: '#db2777' },
        chores: { bg: '#374151', text: '#ffffff', border: '#4b5563' },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      }
    },
  },
  plugins: [],
}
