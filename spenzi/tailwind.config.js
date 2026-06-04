/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0E1A',
        surface: '#111827',
        surface2: '#1a2234',
        border: '#1e2a40',
        accent: '#00D4AA',
        'accent-dim': '#00b090',
        textprimary: '#E8F0FE',
        muted: '#5a7090',
        danger: '#FF6B6B',
        gold: '#FFB547',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
