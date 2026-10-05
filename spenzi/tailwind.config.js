/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0a09',
        shell: '#12100e',
        raised: '#1a1713',
        line: 'rgba(233,215,180,0.14)',
        gold: { DEFAULT: '#c9a96a', soft: '#e4cf9e', deep: '#9c7f48' },
        ivory: '#f4efe6',
        muted: 'rgba(244,239,230,0.74)',
        faint: 'rgba(244,239,230,0.58)',
        sage: '#86bf9f',
        coral: '#e58b7f',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '3xl': '1.5rem', '4xl': '2rem' },
      boxShadow: {
        gold: '0 8px 30px -8px rgba(201,169,106,0.45)',
        lift: '0 10px 40px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { rise: 'rise .35s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
}
